require "test_helper"

class MarkdownRendererTest < ActiveSupport::TestCase
  test "renders wiki links to existing and missing pages" do
    Page.create!(title: "Existing")
    html = MarkdownRenderer.render("[[Existing]] and [[Missing|ラベル]]")

    assert_includes html, %(<a href="/wiki/Existing">Existing</a>)
    assert_includes html, %(href="/pages/new?title=Missing">ラベル</a>)
  end

  test "does not convert wiki links inside code" do
    html = MarkdownRenderer.render("`[[Inline]]`\n\n```\n[[Block]]\n```\n")
    assert_not_includes html, "<a "
  end

  test "strips raw html and dangerous links" do
    html = MarkdownRenderer.render("<script>alert(1)</script>\n\n[x](javascript:alert(1))")
    assert_not_includes html, "<script>"
    assert_not_includes html, "javascript:"
  end

  test "supports gfm tables and task lists" do
    html = MarkdownRenderer.render("| a |\n| - |\n| b |\n\n- [x] done")
    assert_includes html, "<table>"
    assert_includes html, %(type="checkbox")
  end
end
