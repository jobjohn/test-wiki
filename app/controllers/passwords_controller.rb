class PasswordsController < ApplicationController
  skip_before_action :enforce_account_requirements
  before_action -> { request_login unless signed_in? }

  def edit
  end

  def update
    user = current_user
    if !user.authenticate(params[:current_password].to_s)
      flash.now[:alert] = "現在のパスワードが正しくありません。"
      return render :edit, status: :unprocessable_entity
    end
    if params[:password] == params[:current_password]
      flash.now[:alert] = "新しいパスワードは現在のパスワードと異なるものにしてください。"
      return render :edit, status: :unprocessable_entity
    end

    if params[:password].present? && user.update(password: params[:password], password_confirmation: params[:password_confirmation], must_change_password: false)
      refresh_session_token(user)
      redirect_to account_path, notice: "パスワードを変更しました。"
    else
      flash.now[:alert] = user.errors.full_messages.presence&.to_sentence || "新しいパスワードを入力してください。"
      render :edit, status: :unprocessable_entity
    end
  end
end
