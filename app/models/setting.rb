# Wiki 全体の設定（1 レコードのみ）
class Setting < ApplicationRecord
  COLOR_FORMAT = /\A#\h{6}\z/
  COLOR_MODES = { "system" => "システムに合わせる", "light" => "ライト", "dark" => "ダーク" }.freeze

  # 基本 3 色のプリセット
  #   secondary: ベースカラー（ヘッダー・画面の基調色）
  #   primary:   メインカラー（ボタン・リンク・選択中の項目）
  #   accent:    差し色（タグ・強調・フォルダアイコン）
  THEMES = {
    "standard" => { name: "スタンダード", primary: "#2563eb", secondary: "#ffffff", accent: "#16a34a" },
    "ocean"  => { name: "オーシャン", primary: "#2563eb", secondary: "#0f172a", accent: "#f59e0b" },
    "forest" => { name: "フォレスト", primary: "#15803d", secondary: "#14281d", accent: "#eab308" },
    "sunset" => { name: "サンセット", primary: "#ea580c", secondary: "#2b1d16", accent: "#0ea5e9" },
    "grape"  => { name: "グレープ",   primary: "#7c3aed", secondary: "#1e1b2e", accent: "#ec4899" },
    "sakura" => { name: "さくら",     primary: "#db2777", secondary: "#fce7f3", accent: "#0d9488" },
    "mono"   => { name: "モノクロ",   primary: "#374151", secondary: "#111827", accent: "#dc2626" }
  }.freeze
  DEFAULT_THEME = "standard"

  normalizes :wiki_name, with: ->(name) { name.to_s.squish }
  normalizes :primary_color, :secondary_color, :accent_color, with: ->(color) { color.to_s.strip.downcase }

  validates :wiki_name, presence: true, length: { maximum: 50 }
  validates :description, length: { maximum: 2000 }
  validates :primary_color, :secondary_color, :accent_color, format: { with: COLOR_FORMAT }
  validates :color_mode, inclusion: { in: COLOR_MODES.keys }

  def self.current
    first || create!
  end

  def setup_completed?
    setup_completed_at.present?
  end

  def theme=(key)
    preset = THEMES[key.to_s]
    return unless preset

    self.primary_color = preset[:primary]
    self.secondary_color = preset[:secondary]
    self.accent_color = preset[:accent]
  end

  def theme
    THEMES.find { |_, t| t.values_at(:primary, :secondary, :accent) == colors }&.first || "custom"
  end

  def colors
    [ primary_color, secondary_color, accent_color ]
  end

  # 各色と、その上に置く文字色（黒 or 白）の CSS 変数
  def css_variables
    {
      "--primary" => primary_color, "--primary-fg" => self.class.contrast_color(primary_color),
      "--secondary" => secondary_color, "--secondary-fg" => self.class.contrast_color(secondary_color),
      "--accent" => accent_color, "--accent-fg" => self.class.contrast_color(accent_color)
    }.map { |name, value| "#{name}: #{value};" }.join(" ")
  end

  def self.contrast_color(hex)
    r, g, b = hex.to_s.delete("#").scan(/\h\h/).map { |c| c.to_i(16) / 255.0 }
    return "#ffffff" unless b

    luminance = [ r, g, b ].map { |c| c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055)**2.4 }
                           .zip([ 0.2126, 0.7152, 0.0722 ]).sum { |c, w| c * w }
    luminance > 0.4 ? "#111827" : "#ffffff"
  end
end
