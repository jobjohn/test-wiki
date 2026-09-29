# 標準テーマを ベースカラー: 白 / メインカラー: 青 / 差し色: 緑 に変更する
class ChangeDefaultThemeColors < ActiveRecord::Migration[8.0]
  OLD = { primary_color: "#2563eb", secondary_color: "#0f172a", accent_color: "#f59e0b" }.freeze
  NEW = { primary_color: "#2563eb", secondary_color: "#ffffff", accent_color: "#16a34a" }.freeze

  def up
    NEW.each { |column, color| change_column_default :settings, column, from: OLD[column], to: color }
    # 旧標準テーマのままの Wiki は新しい標準テーマに切り替える
    execute <<~SQL
      UPDATE settings SET secondary_color = '#{NEW[:secondary_color]}', accent_color = '#{NEW[:accent_color]}'
      WHERE primary_color = '#{OLD[:primary_color]}' AND secondary_color = '#{OLD[:secondary_color]}' AND accent_color = '#{OLD[:accent_color]}'
    SQL
  end

  def down
    OLD.each { |column, color| change_column_default :settings, column, from: NEW[column], to: color }
  end
end
