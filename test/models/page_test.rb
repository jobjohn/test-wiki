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

  test "cannot set itself or a descendant as parent" do
    root = Page.create!(title: "Root")
    child = Page.create!(title: "Child", parent: root)
    grandchild = Page.create!(title: "Grandchild", parent: child)

    root.parent = grandchild
    assert_not root.valid?
    root.parent = root
    assert_not root.valid?
    assert_equal [ root.id, child.id, grandchild.id ].sort, root.reload.self_and_descendant_ids.sort
  end

  test "destroying a page removes descendants" do
    root = Page.create!(title: "Root")
    child = Page.create!(title: "Child", parent: root)
    Page.create!(title: "Grandchild", parent: child)

    assert_difference -> { Page.count }, -3 do
      root.destroy!
    end
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
