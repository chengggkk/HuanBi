from flask import Flask, request, jsonify
from langchain.chat_models import ChatOpenAI
from flask_cors import CORS
import os


app = Flask(__name__)
CORS(app, origins=["http://localhost:3000"])  # 允許特定來源

# 你的 OpenAI API Key
OPENAI_API_KEY =  os.getenv("OPENAI_API_KEY")


# 初始化 ChatGPT
chat_model = ChatOpenAI(model_name="gpt-4", openai_api_key=OPENAI_API_KEY)

@app.route('/generate-summary', methods=['POST'])
def generate_summary():
    data = request.json
    headlines = data.get("headlines", [])

    if not headlines:
        return jsonify({"error": "No headlines provided"}), 400

    # 生成總結的 prompt
    summary_prompt = f"Please generate a concise summary based on the following news headlines:\n\n{', '.join(headlines)}\n\n摘要："

    try:
        response = chat_model.predict(summary_prompt)

        # 使用 LangChain 進一步修飾
        refinement_prompt = f"Please optimize the following summary to make it more natural and smooth:\n\n{response}\n\n最佳化後的摘要："
        refined_summary = chat_model.predict(refinement_prompt)

        return jsonify({"summary": refined_summary})
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
