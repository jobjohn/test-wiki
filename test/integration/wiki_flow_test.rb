require "test_helper"

class WikiFlowTest < ActionDispatch::IntegrationTest
  setup do
    complete_setup!
    @user = create_user("editor1", display_name: "編集 太郎")
    sign_in_as(@user)
  end

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
    assert_select "td", "編集 太郎"

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

  test "folders can be nested, moved and dissolved" do
    post folders_path, params: { folder: { name: "開発" } }
    dev = Folder.find_by!(name: "開発")
    post folders_path, params: { folder: { name: "API", parent_id: dev.id } }
    api = Folder.find_by!(name: "API")
    assert_redirected_to folder_path(api)

    post pages_path, params: { page: { title: "認証 API", body: "x", folder_id: api.id } }
    page = Page.find_by_title("認証 API")
    assert_equal api, page.folder

    get page_path(page)
    assert_select ".breadcrumbs a", /開発/
    assert_select ".tree details[open] summary", /API/

    get folder_path(dev)
    assert_select ".folder-item-name", "API"

    patch folder_path(api), params: { folder: { name: "API", parent_id: api.id } }
    assert_response :unprocessable_entity

    delete folder_path(api)
    assert_equal dev, page.reload.folder
  end

  test "viewers cannot edit" do
    delete logout_path
    viewer = create_user("viewer1", role: "viewer")
    sign_in_as(viewer)
    page = Page.create!(title: "Readonly")

    get page_path(page)
    assert_response :success
    assert_select "a[href=?]", edit_page_path(page), count: 0

    get edit_page_path(page)
    assert_redirected_to root_path
    post pages_path, params: { page: { title: "New" } }
    assert_nil Page.find_by_title("New")
  end
end
