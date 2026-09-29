# 初回ログイン時の初期設定（Wiki の名前・用途・テーマ・管理者パスワード）
class SetupController < ApplicationController
  skip_before_action :enforce_account_requirements
  before_action :require_admin
  before_action :redirect_if_completed

  def show
    @setting = wiki_setting
  end

  def update
    @setting = wiki_setting
    @setting.assign_attributes(setting_params)
    @setting.setup_completed_at = Time.current
    user = current_user

    if user.must_change_password?
      user.password = params[:password]
      user.password_confirmation = params[:password_confirmation]
      user.must_change_password = false
      if params[:password].blank?
        user.errors.add(:password, "を入力してください")
      elsif params[:password] == User.default_admin_password
        user.errors.add(:password, "は初期パスワードと異なるものにしてください")
      end
    end

    saved = user.errors.empty? && ActiveRecord::Base.transaction do
      (@setting.save && user.save) || raise(ActiveRecord::Rollback)
    end

    if saved
      refresh_session_token(user)
      redirect_to root_path, notice: "初期設定が完了しました。ようこそ「#{@setting.wiki_name}」へ！"
    else
      @setting.setup_completed_at = nil
      @user_errors = user.errors.full_messages
      render :show, status: :unprocessable_entity
    end
  end

  private

  def redirect_if_completed
    redirect_to edit_settings_path if wiki_setting.setup_completed?
  end

  def setting_params
    params.require(:setting).permit(:wiki_name, :description, :theme, :primary_color, :secondary_color, :accent_color)
          .then { |p| p[:theme].present? && p[:theme] != "custom" ? p.except(:primary_color, :secondary_color, :accent_color) : p.except(:theme) }
  end
end
