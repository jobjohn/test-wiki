# 二段階認証（認証アプリのパスコード）の設定
class MfaController < ApplicationController
  skip_before_action :enforce_account_requirements
  before_action -> { request_login unless signed_in? }

  def new
    return redirect_to account_path, notice: "二段階認証は既に有効です。" if current_user.mfa_enabled?

    session[:pending_otp_secret] ||= User.generate_otp_secret
    prepare_enrollment
  end

  def create
    secret = session[:pending_otp_secret]
    return redirect_to new_mfa_path if secret.blank?

    if User.valid_otp?(secret, params[:code])
      @backup_codes = current_user.enable_mfa!(secret)
      session.delete(:pending_otp_secret)
      refresh_session_token(current_user)
      flash.now[:notice] = "二段階認証を有効にしました。"
      render :backup_codes
    else
      flash.now[:alert] = "パスコードが正しくありません。認証アプリに表示されている 6 桁の数字を入力してください。"
      prepare_enrollment
      render :new, status: :unprocessable_entity
    end
  end

  def destroy
    if wiki_setting.require_mfa?
      redirect_to account_path, alert: "この Wiki では二段階認証が必須のため無効にできません。"
    elsif current_user.authenticate(params[:password].to_s)
      current_user.disable_mfa!
      redirect_to account_path, notice: "二段階認証を無効にしました。", status: :see_other
    else
      redirect_to account_path, alert: "パスワードが正しくありません。", status: :see_other
    end
  end

  def backup_codes
    if current_user.mfa_enabled? && current_user.authenticate(params[:password].to_s)
      @backup_codes = current_user.regenerate_backup_codes!
      flash.now[:notice] = "バックアップコードを再発行しました。以前のコードは使えなくなりました。"
      render :backup_codes
    else
      redirect_to account_path, alert: "パスワードが正しくありません。", status: :see_other
    end
  end

  private

  def prepare_enrollment
    @secret = session[:pending_otp_secret]
    uri = User.otp_uri(@secret, current_user.username, wiki_setting.wiki_name)
    @qr_svg = RQRCode::QRCode.new(uri).as_svg(module_size: 5, standalone: true, use_path: true, viewbox: true).html_safe
  end
end
