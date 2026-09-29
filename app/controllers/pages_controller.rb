class PagesController < ApplicationController
  before_action :require_editor, only: %i[new create edit update destroy preview]
  before_action :set_page, only: %i[show edit update destroy]

  def index
    @recent_pages = Page.recently_updated.includes(:tags).limit(10)
    @tags = Tag.with_counts
    @pages_count = Page.count
    @home_page = Page.find_by_title(ENV.fetch("WIKI_HOME_PAGE", "ホーム"))
    @root_folders = Folder.roots
  end

  def show
    respond_to do |format|
      format.html do
        @revision = @page.current_revision
        @backlinks = backlinks_for(@page)
      end
      format.md do
        send_data @page.body, filename: "#{@page.title}.md", type: "text/markdown; charset=utf-8",
                              disposition: params[:download] ? "attachment" : "inline"
      end
    end
  end

  # /wiki/ページ名 でタイトルからページを開く。存在しなければ作成画面へ
  def wiki
    page = Page.find_by_title(params[:title])
    if page
      redirect_to page
    else
      redirect_to new_page_path(title: params[:title])
    end
  end

  def new
    @page = Page.new(title: params[:title], folder_id: params[:folder_id])
  end

  def create
    @page = Page.new(page_params)
    @page.edit_summary = params.dig(:page, :edit_summary).presence || "作成"

    if @page.save
      redirect_to @page, notice: "ページ「#{@page.title}」を作成しました。"
    else
      render :new, status: :unprocessable_entity
    end
  end

  def edit
  end

  def update
    @page.assign_attributes(page_params)
    @page.edit_summary = params.dig(:page, :edit_summary)

    if @page.save
      redirect_to @page, notice: "ページを更新しました。"
    else
      render :edit, status: :unprocessable_entity
    end
  rescue ActiveRecord::StaleObjectError
    @conflict_body = @page.body
    @page = Page.find(@page.id)
    @page.assign_attributes(page_params.except(:lock_version, :body))
    flash.now[:alert] = "他のユーザーがこのページを先に更新しました。最新の内容を確認し、あなたの編集内容を反映してから保存してください。"
    render :edit, status: :conflict
  end

  def destroy
    @page.destroy!
    redirect_to @page.folder || root_path, notice: "ページ「#{@page.title}」を削除しました。", status: :see_other
  end

  def preview
    render html: helpers.tag.div(MarkdownRenderer.render(params[:body]), class: "markdown-body")
  end

  private

  def set_page
    @page = Page.find(params[:id])
  end

  def page_params
    params.require(:page).permit(:title, :body, :folder_id, :tag_list, :position, :lock_version)
  end

  # このページへ [[リンク]] しているページ
  def backlinks_for(page)
    Page.where.not(id: page.id).where("body LIKE ?", "%[[#{Page.sanitize_sql_like(page.title)}%")
        .select { |other| MarkdownRenderer.new(other.body).wiki_link_titles.any? { |t| t.casecmp?(page.title) } }
        .sort_by(&:title)
  end
end
