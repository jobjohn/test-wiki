class RevisionsController < ApplicationController
  PER_PAGE = 50

  before_action :set_page, except: :recent

  def index
    @revisions = @page.revisions
  end

  def show
    @revision = @page.revisions.find_by!(number: params[:number])
    @diff = @revision.diff_from_previous
  end

  def restore
    revision = @page.revisions.find_by!(number: params[:number])
    @page.restore!(revision)
    redirect_to @page, notice: "第#{revision.number}版の内容に復元しました。", status: :see_other
  rescue ActiveRecord::RecordInvalid => e
    redirect_to page_revision_path(@page, revision), alert: "復元できませんでした: #{e.record.errors.full_messages.to_sentence}"
  end

  # 最近の更新（全ページの変更履歴）
  def recent
    @page_number = [ params[:page].to_i, 1 ].max
    scope = Revision.includes(:page).order(created_at: :desc, id: :desc)
    @revisions = scope.offset((@page_number - 1) * PER_PAGE).limit(PER_PAGE + 1).to_a
    @has_next = @revisions.size > PER_PAGE
    @revisions = @revisions.first(PER_PAGE)
  end

  private

  def set_page
    @page = Page.find(params[:page_id])
  end
end
