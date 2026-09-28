class UploadsController < ApplicationController
  def index
    @uploads = Upload.includes(file_attachment: :blob).order(created_at: :desc).limit(200)
  end

  def create
    upload = Upload.new(file: params[:file])

    if upload.save
      url = rails_blob_path(upload.file, only_path: true)
      name = upload.file.filename.to_s
      markdown = upload.image? ? "![#{name}](#{url})" : "[#{name}](#{url})"
      respond_to do |format|
        format.json { render json: { url: url, name: name, markdown: markdown }, status: :created }
        format.html { redirect_to uploads_path, notice: "ファイルをアップロードしました。" }
      end
    else
      respond_to do |format|
        format.json { render json: { error: upload.errors.full_messages.to_sentence }, status: :unprocessable_entity }
        format.html { redirect_to uploads_path, alert: upload.errors.full_messages.to_sentence }
      end
    end
  end

  def destroy
    upload = Upload.find(params[:id])
    upload.file.purge
    upload.destroy!
    redirect_to uploads_path, notice: "ファイルを削除しました。", status: :see_other
  end
end
