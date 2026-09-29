class FoldersController < ApplicationController
  before_action :require_editor, except: :show
  before_action :set_folder, only: %i[show edit update destroy]

  def show
    @children = @folder.children
    @pages = @folder.pages.includes(:tags)
  end

  def new
    @folder = Folder.new(parent_id: params[:parent_id])
  end

  def create
    @folder = Folder.new(folder_params)
    if @folder.save
      redirect_to @folder, notice: "フォルダ「#{@folder.name}」を作成しました。"
    else
      render :new, status: :unprocessable_entity
    end
  end

  def edit
  end

  def update
    if @folder.update(folder_params)
      redirect_to @folder, notice: "フォルダを更新しました。"
    else
      render :edit, status: :unprocessable_entity
    end
  end

  # フォルダを削除し、中身は 1 つ上の階層へ移す
  def destroy
    parent = @folder.parent
    @folder.dissolve!
    redirect_to parent || root_path, notice: "フォルダ「#{@folder.name}」を削除しました（中身は#{parent ? "「#{parent.name}」" : "トップ"}へ移動）。", status: :see_other
  rescue ActiveRecord::RecordInvalid, ActiveRecord::RecordNotDestroyed => e
    redirect_to @folder, alert: "削除できませんでした: #{e.record.errors.full_messages.to_sentence}", status: :see_other
  end

  private

  def set_folder
    @folder = Folder.find(params[:id])
  end

  def folder_params
    params.require(:folder).permit(:name, :parent_id, :position)
  end
end
