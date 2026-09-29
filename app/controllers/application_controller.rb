class ApplicationController < ActionController::Base
  include Authentication

  before_action :enforce_account_requirements

  helper_method :sidebar_tree

  private

  # 初期設定・初回パスワード変更・MFA 必須設定を満たすまで他の画面を使わせない
  def enforce_account_requirements
    return unless signed_in?

    if current_user.admin? && !wiki_setting.setup_completed?
      redirect_to setup_path
    elsif current_user.must_change_password?
      redirect_to edit_password_path, alert: "初回ログインのため、パスワードを変更してください。"
    elsif wiki_setting.require_mfa? && !current_user.mfa_enabled?
      redirect_to new_mfa_path, alert: "この Wiki では二段階認証（MFA）の設定が必須です。"
    end
  end

  def require_editor
    return request_login unless signed_in?
    return if current_user.can_edit?

    redirect_back fallback_location: root_path, alert: "編集権限がありません。"
  end

  def require_admin
    return request_login unless signed_in?
    return if current_user.admin?

    redirect_back fallback_location: root_path, alert: "管理者のみ利用できます。"
  end

  # サイドバー用のツリー（フォルダとページ）
  def sidebar_tree
    @sidebar_tree ||= {
      folders: Folder.order(:position, :name).pluck(:id, :name, :parent_id).group_by(&:last),
      pages: Page.order(:position, :title).pluck(:id, :title, :folder_id).group_by(&:last)
    }
  end
end
