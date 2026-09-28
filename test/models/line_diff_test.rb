require "test_helper"

class LineDiffTest < ActiveSupport::TestCase
  test "counts additions and deletions" do
    diff = LineDiff.new("a\nb\nc", "a\nB\nc\nd")
    assert_equal 2, diff.additions
    assert_equal 1, diff.deletions
    assert diff.changed?
  end

  test "collapses unchanged regions into hunks" do
    old_text = (1..20).map(&:to_s).join("\n")
    new_text = old_text.sub("10", "ten")
    hunks = LineDiff.new(old_text, new_text).hunks(context: 2)

    assert_nil hunks.first
    assert_equal 6, hunks[1].size
    assert_nil hunks.last
  end
end
