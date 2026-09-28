class SearchController < ApplicationController
  PER_PAGE = 30

  def index
    @query = params[:q].to_s.strip
    @page_number = [ params[:page].to_i, 1 ].max
    return @pages = [] if @query.blank?

    # 完全一致するタイトルがあればそのまま開く
    if params[:go].present? && (exact = Page.find_by_title(@query))
      return redirect_to exact
    end

    scope = Page.search(@query).includes(:tags)
    @total = scope.count
    title_first = Arel.sql(ActiveRecord::Base.sanitize_sql_array([ "CASE WHEN pages.title LIKE ? THEN 0 ELSE 1 END", "%#{Page.sanitize_sql_like(@query)}%" ]))
    @pages = scope.order(title_first, updated_at: :desc).offset((@page_number - 1) * PER_PAGE).limit(PER_PAGE)
    @has_next = @total > @page_number * PER_PAGE
  end
end
