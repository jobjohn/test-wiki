class SettingsController < ApplicationController
  before_action :require_admin

  def edit
    @setting = wiki_setting
  end

  def update
    @setting = wiki_setting
    attrs = params.require(:setting).permit(:wiki_name, :description, :theme, :primary_color, :secondary_color,
                                            :accent_color, :color_mode, :public_read, :require_mfa)
    attrs = attrs[:theme].present? && attrs[:theme] != "custom" ? attrs.except(:primary_color, :secondary_color, :accent_color) : attrs.except(:theme)

    if @setting.update(attrs)
      redirect_to edit_settings_path, notice: "設定を保存しました。"
    else
      render :edit, status: :unprocessable_entity
    end
  end
end
