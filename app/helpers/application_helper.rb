module ApplicationHelper
  def wiki_name
    wiki_setting.wiki_name
  end

  def markdown(text)
    tag.div(MarkdownRenderer.render(text), class: "markdown-body")
  end

  def can_edit?
    current_user&.can_edit?
  end

  def admin?
    current_user&.admin?
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

  # フォルダ階層のパンくず
  def folder_breadcrumbs(folder, include_self: true)
    return "".html_safe unless folder

    folders = include_self ? [ *folder.ancestors, folder ] : folder.ancestors
    items = [ link_to(icon("house", size: 14), root_path, title: "ホーム") ]
    items += folders.map { |f| link_to(icon_label("folder", f.name, size: 14), f) }
    safe_join(items, tag.span(icon("chevron-right", size: 14), class: "sep"))
  end

  def folder_options(selected_id = nil, exclude: [])
    options = Folder.options_for_select.reject { |_, id| exclude.include?(id) }
    options_for_select(options, selected_id)
  end

  def theme_style_tag
    tag.style(":root { #{wiki_setting.css_variables} }".html_safe, id: "theme-variables")
  end

  def color_swatches(colors)
    tag.span(safe_join(colors.map { |c| tag.span(class: "swatch", style: "background: #{c}") }), class: "swatches")
  end
end
