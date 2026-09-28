require "diff/lcs"

# 2 つのテキストの行単位の差分
class LineDiff
  Line = Struct.new(:action, :old_number, :new_number, :text) do
    def added? = action == "+"
    def removed? = action == "-"
    def unchanged? = action == "="
  end

  def initialize(old_text, new_text)
    @old_lines = old_text.to_s.split("\n", -1)
    @new_lines = new_text.to_s.split("\n", -1)
  end

  def lines
    @lines ||= Diff::LCS.sdiff(@old_lines, @new_lines).flat_map do |change|
      old_no = change.old_position + 1
      new_no = change.new_position + 1
      case change.action
      when "=" then [ Line.new("=", old_no, new_no, change.old_element) ]
      when "+" then [ Line.new("+", nil, new_no, change.new_element) ]
      when "-" then [ Line.new("-", old_no, nil, change.old_element) ]
      when "!" then [ Line.new("-", old_no, nil, change.old_element), Line.new("+", nil, new_no, change.new_element) ]
      end
    end
  end

  def additions = lines.count(&:added?)
  def deletions = lines.count(&:removed?)
  def changed? = additions.positive? || deletions.positive?

  # 変更箇所の前後 context 行だけを残し、省略部分は nil で表す
  def hunks(context: 3)
    keep = Array.new(lines.size, false)
    lines.each_with_index do |line, i|
      next if line.unchanged?
      ([ i - context, 0 ].max..[ i + context, lines.size - 1 ].min).each { |j| keep[j] = true }
    end
    result = []
    lines.each_with_index do |line, i|
      if keep[i]
        result << line
      elsif result.empty? || result.last
        result << nil
      end
    end
    result.chunk_while { |a, b| !a.nil? == !b.nil? }.map { |group| group.first.nil? ? nil : group }
  end
end
