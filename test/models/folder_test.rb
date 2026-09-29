require "test_helper"

class FolderTest < ActiveSupport::TestCase
  test "folders can be nested and report their path" do
    a = Folder.create!(name: "A")
    b = Folder.create!(name: "B", parent: a)
    c = Folder.create!(name: "C", parent: b)

    assert_equal "A / B / C", c.path_name
    assert_equal [ a, b ], c.ancestors
    assert_equal [ [ "A", a.id ], [ "A / B", b.id ], [ "A / B / C", c.id ] ], Folder.options_for_select
  end

  test "cannot move a folder into itself or its descendants" do
    a = Folder.create!(name: "A")
    b = Folder.create!(name: "B", parent: a)

    a.parent = b
    assert_not a.valid?
    a.parent = a
    assert_not a.valid?
    assert_equal [ [ "A", a.id ] ], b.parent_candidates
  end

  test "names are unique within the same parent" do
    a = Folder.create!(name: "A")
    Folder.create!(name: "Same", parent: a)
    assert_not Folder.new(name: "same", parent: a).valid?
    assert Folder.new(name: "Same").valid?
  end

  test "dissolve moves contents to the parent folder" do
    a = Folder.create!(name: "A")
    b = Folder.create!(name: "B", parent: a)
    c = Folder.create!(name: "C", parent: b)
    page = Page.create!(title: "P", folder: b)

    b.dissolve!

    assert_equal a, c.reload.parent
    assert_equal a, page.reload.folder
    assert_not Folder.exists?(b.id)
  end
end
