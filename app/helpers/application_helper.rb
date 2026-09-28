module ApplicationHelper
  def wiki_name
    ENV.fetch("WIKI_NAME", "Wiki")
  end

  def markdown(text)
    tag.div(MarkdownRenderer.render(text), class: "markdown-body")
  end

  # 検索語の周辺テキストを抜き出し、該当箇所を強調表示する
  def search_snippet(body, query, radius: 60)
    text = body.to_s.gsub(/\s+/, " ")
    terms = query.to_s.split(/[[:space:]]+/).reject(&:blank?)
    index = terms.filter_map { |term| text.downcase.index(term.downcase) }.min || 0
    start = [ index - radius, 0 ].max
    excerpt = text[start, radius * 3].to_s
    excerpt = "…#{excerpt}" if start.positive?
    excerpt = "#{excerpt}…" if start + radius * 3 < text.length
    highlight(excerpt, terms)
  end

  def breadcrumbs(page)
    items = page.ancestors.map { |ancestor| link_to(ancestor.title, ancestor) }
    safe_join(items, tag.span(" / ", class: "sep"))
  end
end
