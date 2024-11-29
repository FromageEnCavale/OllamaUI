const messages = document.getElementById('messages');
const inputField = document.getElementById('input');
const sendButton = document.getElementById('sendBtn');

function addMessage(content, className) {
    const message = document.createElement('div');
    message.className = `message ${className}`;
    message.textContent = content;
    messages.appendChild(message);
}

inputField.addEventListener('input', function () {
    this.style.height = '47px';
    this.style.height = Math.min(this.scrollHeight, 200) + 'px';
});

sendButton.addEventListener('click', async () => {
    const userMessage = inputField.value.trim();
    if (!userMessage) return;

    addMessage(userMessage, 'user');
    inputField.value = '';
    inputField.style.height = '47px';

    try {
        const response = await fetch('http://localhost:11434/v1/chat/completions', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                model: 'qwen2.5-coder:3b-instruct-q8_0',
                stream: true,
                messages: [{role: 'user', content: userMessage}]
            })
        });

        if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let botmessage = document.createElement('div');
        botmessage.className = 'message bot';
        messages.appendChild(botmessage);

        let done = false;
        while (!done) {
            const {value, done: readerDone} = await reader.read();
            done = readerDone;

            if (value) {
                const chunk = decoder.decode(value, {stream: true});
                const lines = chunk.split('\n').filter(line => line.trim() !== '');
                for (const line of lines) {
                    if (line === 'data: [DONE]') {
                        done = true;
                        break;
                    }
                    if (line.startsWith('data: ')) {
                        const jsonResponse = JSON.parse(line.substring(6));
                        if (jsonResponse.choices && jsonResponse.choices[0].delta.content) {
                            const contentChunk = jsonResponse.choices[0].delta.content.replace(/\n/g, '<br>').replace(/ {2}/g, '&nbsp;&nbsp;');
                            botmessage.innerHTML += contentChunk;
                        }
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error:', error);
        addMessage('Your Ollama server has not started!', 'bot');
    }
});

inputField.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendButton.click();
    }
});