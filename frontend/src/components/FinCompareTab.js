import React, { useState } from "react";

function FinCompareTab({ language }) {
  const [file1, setFile1] = useState(null);
  const [file2, setFile2] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleCompare = async () => {
    if (!file1 || !file2) return;
    setLoading(true);
    setResult(null);
    const formData = new FormData();
    formData.append("file1", file1);
    formData.append("file2", file2);
    formData.append("min_interest", 0);
    formData.append("max_lockin", 100);
    formData.append("product_type", "loan"); // or "fd"

    try {
      const resp = await fetch("http://127.0.0.1:8000/compare/", {
        method: "POST",
        body: formData,
      });
      const data = await resp.json();
      setResult(data);
    } catch (err) {
      setResult({ error: "Failed to compare documents." });
    }
    setLoading(false);
  };

  return (
    <div className="fincompare-tab">
      <h3>{language === "en" ? "Compare Financial Documents" : "ಹಣಕಾಸು ದಾಖಲೆಗಳನ್ನು ಹೋಲಿಸಿ"}</h3>
      <div className="file-upload-row">
        <input type="file" accept=".pdf" onChange={e => setFile1(e.target.files[0])} />
        <input type="file" accept=".pdf" onChange={e => setFile2(e.target.files[0])} />
        <button onClick={handleCompare} disabled={!file1 || !file2 || loading}>
          {loading ? (language === "en" ? "Comparing..." : "ಹೋಲಿಸಲಾಗುತ್ತಿದೆ...") : (language === "en" ? "Compare" : "ಹೋಲಿಸಿ")}
        </button>
      </div>
      {result && (
        <div className="compare-result">
          {result.error && <div className="error">{result.error}</div>}
          {result.recommendation && (
            <>
              <div className="recommendation">{result.recommendation}</div>
              <div className="doc-summary">
                <h4>Document 1</h4>
                <pre>{JSON.stringify(result.doc1, null, 2)}</pre>
                <h4>Document 2</h4>
                <pre>{JSON.stringify(result.doc2, null, 2)}</pre>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default FinCompareTab;
