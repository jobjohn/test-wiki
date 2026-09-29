# ログイン状態の管理。設定で「ログインなしで閲覧を許可」が有効な場合、閲覧（GET）はログイン不要
module Authentication
  extend ActiveSupport::Concern

  included do
    before_action :require_authentication
    helper_method :current_user, :signed_in?, :wiki_setting
  end

  class_methods do
    def allow_unauthenticated_access(**options)
      skip_before_action :require_authentication, **options
    end
  end

  private

  def current_user
    return @current_user if defined?(@current_user)

    user = User.find_by(id: session[:user_id]) if session[:user_id]
    valid = user && ActiveSupport::SecurityUtils.secure_compare(session[:user_token].to_s, user.session_token)
    @current_user = valid ? user : nil
    Current.user = @current_user
  end

  def signed_in?
    current_user.present?
  end

  def wiki_setting
    @wiki_setting ||= Setting.current
  end

  def require_authentication
    return if signed_in?
    return if wiki_setting.public_read? && (request.get? || request.head?)

    request_login
  end

  def request_login
    session[:return_to] = request.fullpath if request.get? && request.format.html?
    respond_to do |format|
      format.html { redirect_to main_app.login_path, alert: "ログインしてください。" }
      format.any { head :unauthorized }
    end
  end

  def sign_in(user)
    return_to = session[:return_to]
    reset_session
    session[:user_id] = user.id
    session[:user_token] = user.session_token
    user.update_column(:last_sign_in_at, Time.current)
    @current_user = Current.user = user
    return_to
  end

  # パスワード変更後もこのセッションを維持する
  def refresh_session_token(user)
    session[:user_token] = user.session_token
  end

  def sign_out
    reset_session
    @current_user = Current.user = nil
  end
end
