class AccountsController < ApplicationController
  before_action :require_login

  def show
    @user = current_user
  end

  def update
    @user = current_user
    if @user.update(params.require(:user).permit(:display_name))
      redirect_to account_path, notice: "プロフィールを更新しました。"
    else
      render :show, status: :unprocessable_entity
    end
  end

  private

  def require_login
    request_login unless signed_in?
  end
end
