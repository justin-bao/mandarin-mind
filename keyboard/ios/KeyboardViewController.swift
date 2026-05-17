import UIKit

struct KeyboardIssue: Decodable {
    let rangeText: String
    let type: String
    let severity: String
    let message: String
    let replacement: String?
}

struct KeyboardTone: Decodable {
    let label: String
    let summary: String
    let authenticityScore: Int
}

struct KeyboardAnalysis: Decodable {
    let originalText: String
    let correctedText: String
    let pinyin: String
    let translation: String
    let issues: [KeyboardIssue]
    let tone: KeyboardTone
    let suggestions: [String]
}

final class KeyboardViewController: UIInputViewController {
    private let apiBaseURL = "http://localhost:5000"
    private var accessToken: String?

    private let inputField = UITextView()
    private let analyzeButton = UIButton(type: .system)
    private let insertButton = UIButton(type: .system)
    private let resultLabel = UILabel()
    private let issueStack = UIStackView()
    private var latestAnalysis: KeyboardAnalysis?

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0.96, green: 0.97, blue: 0.98, alpha: 1)
        buildInterface()
    }

    private func buildInterface() {
        inputField.font = .systemFont(ofSize: 18)
        inputField.layer.cornerRadius = 8
        inputField.layer.borderWidth = 1
        inputField.layer.borderColor = UIColor(red: 0.87, green: 0.88, blue: 0.91, alpha: 1).cgColor
        inputField.backgroundColor = .white
        inputField.textContainerInset = UIEdgeInsets(top: 8, left: 8, bottom: 8, right: 8)
        inputField.heightAnchor.constraint(equalToConstant: 72).isActive = true

        analyzeButton.setTitle("Analyze", for: .normal)
        analyzeButton.titleLabel?.font = .boldSystemFont(ofSize: 16)
        analyzeButton.backgroundColor = UIColor(red: 0.93, green: 0.61, blue: 0.12, alpha: 1)
        analyzeButton.tintColor = .white
        analyzeButton.layer.cornerRadius = 8
        analyzeButton.addTarget(self, action: #selector(analyzeTapped), for: .touchUpInside)

        insertButton.setTitle("Insert Correction", for: .normal)
        insertButton.titleLabel?.font = .boldSystemFont(ofSize: 16)
        insertButton.backgroundColor = UIColor(red: 0.90, green: 0.91, blue: 0.93, alpha: 1)
        insertButton.tintColor = .black
        insertButton.layer.cornerRadius = 8
        insertButton.addTarget(self, action: #selector(insertTapped), for: .touchUpInside)

        resultLabel.font = .systemFont(ofSize: 14)
        resultLabel.textColor = .darkGray
        resultLabel.numberOfLines = 0
        resultLabel.text = "Type Chinese or pinyin, then check naturalness."

        issueStack.axis = .vertical
        issueStack.spacing = 6

        let buttonRow = UIStackView(arrangedSubviews: [analyzeButton, insertButton])
        buttonRow.axis = .horizontal
        buttonRow.spacing = 8
        buttonRow.distribution = .fillEqually
        buttonRow.heightAnchor.constraint(equalToConstant: 44).isActive = true

        let root = UIStackView(arrangedSubviews: [inputField, buttonRow, resultLabel, issueStack])
        root.axis = .vertical
        root.spacing = 10
        root.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(root)

        NSLayoutConstraint.activate([
            root.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 10),
            root.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -10),
            root.topAnchor.constraint(equalTo: view.topAnchor, constant: 10),
            root.bottomAnchor.constraint(lessThanOrEqualTo: view.bottomAnchor, constant: -10)
        ])
    }

    @objc private func analyzeTapped() {
        let text = inputField.text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else {
            resultLabel.text = "Type something first."
            return
        }

        Task { await analyze(text: text) }
    }

    @objc private func insertTapped() {
        guard let correctedText = latestAnalysis?.correctedText else { return }
        textDocumentProxy.insertText(correctedText)
    }

    private func analyze(text: String) async {
        guard let url = URL(string: "\(apiBaseURL)/api/keyboard/analyze") else { return }

        await MainActor.run {
            analyzeButton.setTitle("Checking...", for: .normal)
            analyzeButton.isEnabled = false
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let accessToken {
            request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        }
        request.httpBody = try? JSONSerialization.data(withJSONObject: ["text": text])

        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
                await MainActor.run { resultLabel.text = "Sign in through MandarinMind before using keyboard analysis." }
                return
            }

            let analysis = try JSONDecoder().decode(KeyboardAnalysis.self, from: data)
            await MainActor.run { render(analysis) }
        } catch {
            await MainActor.run { resultLabel.text = "Could not analyze this text. Check network access and backend URL." }
        }

        await MainActor.run {
            analyzeButton.setTitle("Analyze", for: .normal)
            analyzeButton.isEnabled = true
        }
    }

    private func render(_ analysis: KeyboardAnalysis) {
        latestAnalysis = analysis
        issueStack.arrangedSubviews.forEach { $0.removeFromSuperview() }

        resultLabel.text = """
        \(analysis.correctedText)
        \(analysis.pinyin)
        Tone: \(analysis.tone.label) - \(analysis.tone.summary) (\(analysis.tone.authenticityScore)/100)
        """

        for issue in analysis.issues.prefix(4) {
            let label = UILabel()
            label.font = .systemFont(ofSize: 13)
            label.numberOfLines = 0
            let replacement = issue.replacement.map { " -> \($0)" } ?? ""
            label.text = "\(issue.rangeText)\(replacement): \(issue.message)"
            issueStack.addArrangedSubview(label)
        }
    }
}
