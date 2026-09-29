class SessionsController < ApplicationController
  allow_unauthenticated_access
  skip_before_action :enforce_account_requirements
  rate_limit to: 10, within: 3.minutes, only: :create,
             with: -> { redirect_to login_path, alert: "ログイン試行回数が多すぎます。しばらく待ってから再度お試しください。" }

  layout "auth"

  def new
    User.ensure_default_admin!
    redirect_to root_path if signed_in?
  end

  def create
    User.ensure_default_admin!
    user = User.find_by_username(params[:username])

    if user&.authenticate(params[:password].to_s)
      if user.mfa_enabled?
        start_mfa_challenge(user)
        redirect_to mfa_challenge_path
      else
        redirect_to sign_in(user) || root_path, notice: "ログインしました。"
      end
    else
      flash.now[:alert] = "ユーザー名またはパスワードが正しくありません。"
      render :new, status: :unprocessable_entity
    end
  end

  def destroy
    sign_out
    redirect_to login_path, notice: "ログアウトしました。", status: :see_other
  end

  private

  def start_mfa_challenge(user)
    return_to = session[:return_to]
    reset_session
    session[:return_to] = return_to
    session[:mfa_user_id] = user.id
    session[:mfa_user_token] = user.session_token
    session[:mfa_started_at] = Time.current.to_i
  end
end
