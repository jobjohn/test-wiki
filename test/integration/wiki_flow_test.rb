require "test_helper"

class WikiFlowTest < ActionDispatch::IntegrationTest
  test "create, view, edit, view history, restore and delete a page" do
    get root_path
    assert_response :success

    post pages_path, params: { page: { title: "手順書", body: "# 見出し\n\n本文", tag_list: "運用" } }
    page = Page.find_by_title("手順書")
    assert_redirected_to page_path(page)
    follow_redirect!
    assert_select "h1", "手順書"
    assert_select ".markdown-body h1", /見出し/

    patch page_path(page), params: { page: { title: "手順書", body: "更新後", lock_version: page.lock_version, edit_summary: "修正" } }
    assert_redirected_to page_path(page)

    get page_revisions_path(page)
    assert_select "td", "修正"

    get page_revision_path(page, 2)
    assert_response :success
    assert_select ".diff-add"

    post restore_page_revision_path(page, 1)
    assert_equal "# 見出し\n\n本文", page.reload.body

    get page_path(page, format: :md)
    assert_equal "# 見出し\n\n本文", response.body

    delete page_path(page)
    assert_redirected_to root_path
    assert_nil Page.find_by(id: page.id)
  end

  test "stale edits are reported as conflicts" do
    page = Page.create!(title: "Conflict", body: "base")
    stale_version = page.lock_version
    page.update!(body: "someone else")

    patch page_path(page), params: { page: { title: "Conflict", body: "mine", lock_version: stale_version } }
    assert_response :conflict
    assert_select "textarea[readonly]", "mine"
    assert_equal "someone else", page.reload.body
  end

  test "invalid page re-renders form" do
    post pages_path, params: { page: { title: "" } }
    assert_response :unprocessable_entity
  end

  test "wiki path resolves titles" do
    page = Page.create!(title: "API/v1")
    get wiki_path(title: "api/v1")
    assert_redirected_to page_path(page)

    get wiki_path(title: "Nope")
    assert_redirected_to new_page_path(title: "Nope")
  end

  test "search, tags, recent changes and preview" do
    Page.create!(title: "Docker メモ", body: "compose up で起動", tag_list: "infra")

    get search_path(q: "compose")
    assert_select ".page-list-title", "Docker メモ"
    assert_select ".snippet mark", "compose"

    get search_path(q: "docker メモ", go: 1)
    assert_redirected_to page_path(Page.find_by_title("Docker メモ"))

    get tags_path
    assert_select ".tag", /infra/
    get tag_path("infra")
    assert_select ".page-list-title", "Docker メモ"

    get recent_changes_path
    assert_select "td a", "Docker メモ"

    post preview_pages_path, params: { body: "**bold**" }
    assert_includes response.body, "<strong>bold</strong>"
  end

  test "uploads files" do
    file = Rack::Test::UploadedFile.new(StringIO.new("hello"), "text/plain", original_filename: "memo.txt")
    post uploads_path, params: { file: file }, headers: { "Accept" => "application/json" }
    assert_response :created
    assert_match %r{\A\[memo\.txt\]\(/rails/active_storage/blobs/}, response.parsed_body["markdown"]

    get uploads_path
    assert_select "td a", "memo.txt"
  end

  test "basic auth when password configured" do
    ENV["WIKI_PASSWORD"] = "secret"
    get root_path
    assert_response :unauthorized

    get root_path, headers: { "Authorization" => ActionController::HttpAuthentication::Basic.encode_credentials("admin", "secret") }
    assert_response :success
  ensure
    ENV.delete("WIKI_PASSWORD")
  end
end
