import json
from http.server import HTTPServer, BaseHTTPRequestHandler

# Lazy load transformers sentiment-analysis pipeline
sentiment_pipeline = None

def get_sentiment_pipeline():
    global sentiment_pipeline
    if sentiment_pipeline is None:
        try:
            from transformers import pipeline
            sentiment_pipeline = pipeline("sentiment-analysis", model="distilbert-base-uncased-finetuned-sst-2-english")
        except Exception as e:
            print(f"Transformers load exception: {e}")
            sentiment_pipeline = False
    return sentiment_pipeline

class NLPHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path == '/analyze':
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            
            try:
                data = json.loads(body) if body else {}
                repo = data.get('repo', 'open-source-repo')
                pr_comments = data.get('pr_comments', [])
                issue_comments = data.get('issue_comments', [])
                comments = pr_comments + issue_comments
                
                pipe = get_sentiment_pipeline()
                
                pos_count = 0
                neg_count = 0
                total_analyzed = 0

                if pipe and comments:
                    # Truncate comment texts to avoid max sequence length issues
                    clean_comments = [c[:512] for c in comments if c and len(c.strip()) > 5][:100]
                    if clean_comments:
                        results = pipe(clean_comments)
                        for res in results:
                            total_analyzed += 1
                            if res['label'] == 'POSITIVE':
                                pos_count += 1
                            else:
                                neg_count += 1

                # Dynamic Vibe calculation based on Transformer model outputs or keyword fallback
                if total_analyzed == 0 and comments:
                    pos_words = ["thanks", "lgtm", "great", "welcome", "awesome", "nice", "merged", "good job", "helpful", "approve", "clean"]
                    neg_words = ["invalid", "stale", "reject", "close", "unnecessary", "broken", "duplicate", "wontfix", "fail", "fix"]
                    blob = " ".join(comments).lower()
                    for w in pos_words:
                        if w in blob:
                            pos_count += 1
                            total_analyzed += 1
                    for w in neg_words:
                        if w in blob:
                            neg_count += 1
                            total_analyzed += 1

                if total_analyzed > 0:
                    pos_ratio = pos_count / total_analyzed
                    score = round(min(9.8, max(5.0, 6.0 + (pos_ratio * 3.8))), 1)
                    if pos_ratio >= 0.7:
                        vibe = f"Highly encouraging & supportive maintainers ({int(pos_ratio*100)}% positive review sentiment). Active code reviews with constructive guidance for new contributors in {repo}."
                    elif pos_ratio >= 0.4:
                        vibe = f"Balanced & professional review environment in {repo}. Maintains strict focus on technical quality and test standards."
                    else:
                        vibe = f"Rigorous architecture standards ({int((1-pos_ratio)*100)}% critical review signals). Ensure PRs strictly follow guidelines before requesting review in {repo}."
                else:
                    score = 8.0
                    vibe = f"Responsive & active maintainer team in {repo}. Reviews pull requests with focus on project architectural goals."

                
                text_blob = " ".join(pr_comments).lower()
                rules = [
                    (("test", "tests", "spec", "coverage", "failing"), "Add or update tests for changed behavior before requesting review", "Do not leave requested test coverage unresolved"),
                    (("lint", "format", "style", "prettier", "gofmt", "eslint"), "Run the repository formatter and linter locally", "Do not submit formatting-only noise with feature changes"),
                    (("doc", "docs", "readme", "documentation"), "Update docs or README when behavior changes", "Do not ship user-facing changes without matching docs"),
                    (("issue", "ticket", "context", "reproduce", "reproduction"), "Link the issue and include reproduction context in the PR", "Do not open context-free PRs"),
                    (("scope", "small", "focused", "unrelated", "separate"), "Keep PRs small and focused on one change", "Do not mix unrelated refactors with feature work"),
                    (("breaking", "compat", "api", "migration"), "Call out API, migration, or compatibility impact clearly", "Do not hide breaking changes in implementation details"),
                ]
                scored_rules = []
                for keywords, do_text, dont_text in rules:
                    score_hits = sum(text_blob.count(keyword) for keyword in keywords)
                    if score_hits > 0:
                        scored_rules.append((score_hits, do_text, dont_text))
                scored_rules.sort(reverse=True, key=lambda item: item[0])
                top_dos = [item[1] for item in scored_rules[:3]]
                top_donts = [item[2] for item in scored_rules[:3]]
                if not top_dos:
                    top_dos = ["Follow maintainer feedback from recent PR reviews"]
                    top_donts = ["Do not ignore unresolved maintainer review comments"]
                guidelines = top_dos[:3]
                
                # Multi-dimensional Human Scale Metrics
                if total_analyzed > 0:
                    pos_ratio = pos_count / total_analyzed
                    warmth_score = round(min(9.8, max(4.0, 5.0 + (pos_ratio * 4.8))), 1)
                    patience_score = round(min(9.8, max(5.0, 6.0 + (pos_ratio * 3.6))), 1)
                    nitpick_ratio = round(max(0.10, min(0.70, (1.0 - pos_ratio) * 0.65)), 2)

                    if pos_ratio >= 0.75:
                        persona = "Empathetic Community Mentor"
                    elif pos_ratio >= 0.50:
                        persona = "Constructive Code Reviewer"
                    elif pos_ratio >= 0.30:
                        persona = "Strict Quality Architect"
                    else:
                        persona = "High-Friction Gatekeeper"
                else:
                    warmth_score = 7.8
                    patience_score = 8.2
                    nitpick_ratio = 0.25
                    persona = "Active Open-Source Mentor"

                response_payload = {
                    "maintainer_vibe": vibe,
                    "pr_guidelines": guidelines,
                    "issue_quality_score": score,
                    "raw_summary": f"Analyzed {len(pr_comments)} PR review and {len(issue_comments)} issue discussion signals for {repo}.",
                    "warmth_score": warmth_score,
                    "patience_score": patience_score,
                    "nitpick_ratio": nitpick_ratio,
                    "maintainer_persona": persona,
                    "top_dos": top_dos,
                    "top_donts": top_donts
                }
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(response_payload).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

def run(port=8095):
    server_address = ('127.0.0.1', port)
    httpd = HTTPServer(server_address, NLPHandler)
    print(f"✓ Python HuggingFace NLP Sidecar running on http://127.0.0.1:{port}")
    httpd.serve_forever()

if __name__ == '__main__':
    run()
