require "test_helper"

class PageTest < ActiveSupport::TestCase
  test "records a revision on create and on content change" do
    page = Page.create!(title: "A", body: "one", edit_summary: "作成")
    assert_equal [ 1 ], page.revisions.pluck(:number)

    page.update!(body: "two", edit_summary: "更新")
    assert_equal [ 2, 1 ], page.revisions.reload.pluck(:number)
    assert_equal "更新", page.current_revision.summary

    page.update!(position: 3)
    assert_equal 2, page.revisions.count
  end

  test "title is unique case-insensitively" do
    Page.create!(title: "Guide")
    page = Page.new(title: "guide")
    assert_not page.valid?
    assert page.errors.of_kind?(:title, :taken)
  end

  test "pages belong to folders" do
    folder = Folder.create!(name: "Docs")
    page = Page.create!(title: "In folder", folder: folder)
    assert_equal [ page ], folder.pages.to_a
    assert_includes Page.roots, Page.create!(title: "Root page")
  end

  test "tag list is parsed and reused case-insensitively" do
    page = Page.create!(title: "Tagged", tag_list: "Ruby, rails　手順書、ruby")
    assert_equal %w[Ruby rails 手順書].sort, page.tags.map(&:name).sort

    other = Page.create!(title: "Other", tag_list: "RUBY")
    assert_equal page.tags.find_by(name: "Ruby"), other.tags.first

    assert_equal [ "ab" ], Page.create!(title: "Slash", tag_list: "a/b").tags.map(&:name)
  end

  test "search matches all terms in title or body" do
    Page.create!(title: "Docker 手順", body: "compose で起動")
    Page.create!(title: "Other", body: "docker だけ")

    assert_equal [ "Docker 手順" ], Page.search("docker compose").pluck(:title)
    assert_equal 2, Page.search("DOCKER").count
    assert_equal 0, Page.search("100%").count
  end

  test "restore creates a new revision with old content" do
    page = Page.create!(title: "A", body: "v1")
    page.update!(body: "v2")
    page.restore!(page.revisions.find_by(number: 1))

    assert_equal "v1", page.reload.body
    assert_equal 3, page.current_revision.number
  end
end
