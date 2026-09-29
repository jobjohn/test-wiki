require "test_helper"

class SettingTest < ActiveSupport::TestCase
  test "applies theme presets and detects custom colors" do
    setting = Setting.current
    setting.update!(theme: "forest")
    assert_equal "forest", setting.theme
    assert_equal "#15803d", setting.primary_color

    setting.update!(primary_color: "#123456")
    assert_equal "custom", setting.theme
  end

  test "rejects invalid colors" do
    assert_not Setting.new(primary_color: "red").valid?
    assert_not Setting.new(primary_color: "#12345g").valid?
  end

  test "css variables include readable foreground colors" do
    css = Setting.new(primary_color: "#ffffff", secondary_color: "#000000", accent_color: "#f59e0b").css_variables
    assert_includes css, "--primary-fg: #111827;"
    assert_includes css, "--secondary-fg: #ffffff;"
  end
end
