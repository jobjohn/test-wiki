# ユーザー管理（管理者）
class UsersController < ApplicationController
  before_action :require_admin
  before_action :set_user, except: %i[index new create]

  def index
    @users = User.order(:username)
  end

  def new
    @user = User.new(role: "editor", must_change_password: true)
  end

  def create
    @user = User.new(user_params)
    if @user.save
      redirect_to users_path, notice: "ユーザー「#{@user.username}」を作成しました。"
    else
      render :new, status: :unprocessable_entity
    end
  end

  def edit
  end

  def update
    attrs = user_params
    attrs = attrs.except(:password, :password_confirmation) if attrs[:password].blank?
    if @user.update(attrs)
      redirect_to users_path, notice: "ユーザー「#{@user.username}」を更新しました。"
    else
      render :edit, status: :unprocessable_entity
    end
  end

  def destroy
    if @user == current_user
      redirect_to users_path, alert: "自分自身は削除できません。"
    elsif @user.destroy
      redirect_to users_path, notice: "ユーザー「#{@user.username}」を削除しました。", status: :see_other
    else
      redirect_to users_path, alert: @user.errors.full_messages.to_sentence
    end
  end

  def reset_mfa
    @user.disable_mfa!
    redirect_to edit_user_path(@user), notice: "二段階認証をリセットしました。", status: :see_other
  end

  private

  def set_user
    @user = User.find(params[:id])
  end

  def user_params
    params.require(:user).permit(:username, :display_name, :role, :password, :password_confirmation, :must_change_password)
  end
end
