# ログイン時の二段階認証（パスコード入力）
class MfaChallengesController < ApplicationController
  CHALLENGE_TTL = 10.minutes

  allow_unauthenticated_access
  skip_before_action :enforce_account_requirements
  before_action :set_pending_user
  rate_limit to: 10, within: 3.minutes, only: :create,
             with: -> { redirect_to login_path, alert: "試行回数が多すぎます。しばらく待ってから再度お試しください。" }

  layout "auth"

  def new
  end

  def create
    if @user.verify_mfa_code(params[:code])
      redirect_to sign_in(@user) || root_path, notice: "ログインしました。"
    else
      flash.now[:alert] = "パスコードが正しくありません。"
      render :new, status: :unprocessable_entity
    end
  end

  private

  def set_pending_user
    user = User.find_by(id: session[:mfa_user_id])
    fresh = session[:mfa_started_at].to_i > CHALLENGE_TTL.ago.to_i
    valid = user && fresh && ActiveSupport::SecurityUtils.secure_compare(session[:mfa_user_token].to_s, user.session_token)
    return @user = user if valid

    reset_session
    redirect_to login_path, alert: "もう一度ログインしてください。"
  end
end
