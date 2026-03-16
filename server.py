from flask import Flask, jsonify
import os

app = Flask(__name__)

@app.route('/')
def index():
    return "Server is running. Frontend files will be served separately."

@app.route('/api/check')
def check():
    return jsonify({"status": "ok", "time": str(os.times())})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)