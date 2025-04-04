// Elementos do DOM que vamos usar
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const fileInput = document.getElementById('fileInput');
const controls = document.getElementById('controls');
const downloadBtn = document.getElementById('downloadBtn');
const resetBtn = document.getElementById('resetBtn');
const linkedinBtn = document.getElementById('linkedinBtn');
const loadingOverlay = document.getElementById('loadingOverlay');
const errorMessage = document.getElementById('errorMessage');
const zoomSlider = document.getElementById('zoomSlider');
const rotateSlider = document.getElementById('rotateSlider');
const zoomValue = document.getElementById('zoomValue');
const rotationValue = document.getElementById('rotationValue');
const shareModal = document.getElementById('shareModal');
const modalPreview = document.getElementById('modalPreview');
const shareBtn = document.getElementById('shareBtn');
const canvasContainer = document.getElementById('canvasContainer');

// Variáveis de estado da aplicação
let img = null; // Armazena a imagem do usuário
let twibbon = new Image(); // Armazena o selo Abril Verde
let minScale = 1; // Escala mínima (100%)
let scale = 1; // Escala atual da imagem
let rotation = 0; // Rotação atual em radianos
let offsetX = 0; // Deslocamento horizontal
let offsetY = 0; // Deslocamento vertical
let isDragging = false; // Flag para arrastar a imagem
let startX, startY; // Posições iniciais do arrasto
let canvasSize; // Tamanho do canvas
let lastGeneratedImage = null; // Última imagem gerada para download
let animationFrameId = null; // ID para controle de animação
let originalImageData = null; // Dados originais para reset

// Inicialização da aplicação
function init() {
    console.log('Iniciando aplicativo...');
    
    // Configura o canvas responsivo
    setupCanvas();
    
    // Configura os listeners de eventos
    setupEventListeners();
    
    // Mostra estado inicial
    drawInitialCanvas();
    
    // Carrega o twibbon (selo Abril Verde)
    loadTwibbon();
}

// Configura o canvas com tamanho responsivo
function setupCanvas() {
    function resizeCanvas() {
        const container = document.querySelector('.canvas-container');
        canvasSize = Math.min(container.offsetWidth, 500);
        canvas.width = canvasSize;
        canvas.height = canvasSize;
        
        if (img) {
            draw();
        } else {
            drawInitialCanvas();
        }
    }
    
    // Configura o tamanho inicial e listener para redimensionamento
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
}

// Desenha o estado inicial do canvas (antes do upload)
function drawInitialCanvas() {
    // Fundo HD
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Twibbon com qualidade
    if (twibbon.complete && twibbon.naturalHeight !== 0) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(twibbon, 0, 0, canvas.width, canvas.height);
    }
    
    // Texto melhorado
    ctx.fillStyle = '#005b24';
    ctx.font = 'bold 24px "Gill Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(255,255,255,0.8)';
    ctx.shadowBlur = 4;
    ctx.fillText('Sua imagem aparecerá aqui', canvas.width/2, canvas.height/2);
    ctx.shadowColor = 'transparent';
}

// Carrega o twibbon (selo Abril Verde)
function loadTwibbon() {
    twibbon.src = 'assets/twibbon.png';
    twibbon.onload = function() {
        // Redesenha o canvas quando o twibbon carregar
        drawInitialCanvas();
    };
    twibbon.onerror = function() {
        console.error('Erro ao carregar o twibbon');
        // Fallback - desenha um placeholder simples
        ctx.fillStyle = '#005b24';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ffffff';
        ctx.font = '20px Gill Sans';
        ctx.textAlign = 'center';
        ctx.fillText('Abril Verde', canvas.width/2, canvas.height/2 - 20);
        ctx.fillText('Montarsul', canvas.width/2, canvas.height/2 + 20);
    };
}

// Configura os listeners de eventos
function setupEventListeners() {
    // Upload de imagem
    fileInput.addEventListener('change', handleUpload);
    
    // Eventos de arrastar para desktop
    canvas.addEventListener('mousedown', startDrag);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', endDrag);
    
    // Eventos de toque para mobile
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd);
    
    // Teclado para acessibilidade
    document.addEventListener('keydown', handleKeyDown);
    
    // Botões
    downloadBtn.addEventListener('click', downloadImage);
    resetBtn.addEventListener('click', resetImage);
    shareBtn.addEventListener('click', shareOnLinkedIn);
    
    // Botão de voltar para o post (configura o link corretamente)
    linkedinBtn.addEventListener('click', function() {
        window.open('http://linkedin.com/company/montarsul-group/', '_blank');
    });
}

// Manipula o upload da imagem
function handleUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Verifica se é uma imagem válida
    if (!file.type.match('image.*')) {
        showError('Por favor, selecione um arquivo de imagem válido (JPEG, PNG)');
        return;
    }

    showLoading(true);
    
    const reader = new FileReader();
    reader.onload = function(e) {
        img = new Image();
        img.onload = function() {
            // Calcula a escala inicial para a imagem caber no canvas
            const scaleX = canvasSize / img.width;
            const scaleY = canvasSize / img.height;
            minScale = Math.max(scaleX, scaleY);
            scale = minScale;
            offsetX = 0;
            offsetY = 0;
            rotation = 0;
            
            // Reseta os controles
            zoomSlider.value = 100;
            rotateSlider.value = 0;
            zoomValue.textContent = '100%';
            rotationValue.textContent = '0°';
            
            // Mostra os controles
            controls.style.display = 'flex';
            downloadBtn.disabled = false;
            resetBtn.disabled = false;
            linkedinBtn.style.display = 'none'; // Ainda não mostra o botão do LinkedIn
            
            // Salva os dados originais para reset
            originalImageData = {
                scale: scale,
                rotation: rotation,
                offsetX: offsetX,
                offsetY: offsetY
            };
            
            // Desenha a imagem
            draw();
            showLoading(false);
        };
        img.onerror = function() {
            showError('Erro ao carregar a imagem');
            showLoading(false);
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// Atualiza o zoom baseado no slider
function updateZoom(value) {
    scale = minScale * (value / 100);
    zoomValue.textContent = `${value}%`;
    constrainOffsets();
    draw();
}

// Atualiza a rotação baseado no slider
function updateRotation(value) {
    rotation = value * Math.PI / 180;
    rotationValue.textContent = `${value}°`;
    constrainOffsets();
    draw();
}

// Garante que a imagem não saia dos limites do canvas
function constrainOffsets() {
    if (!img) return;
    
    const rad = Math.abs(rotation);
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    
    const scaledWidth = img.width * scale;
    const scaledHeight = img.height * scale;
    
    const boxWidth = scaledWidth * cos + scaledHeight * sin;
    const boxHeight = scaledWidth * sin + scaledHeight * cos;
    
    if (boxWidth > canvas.width) {
        offsetX = Math.min((boxWidth - canvas.width) / 2, Math.max(-(boxWidth - canvas.width) / 2, offsetX));
    } else {
        offsetX = 0;
    }
    
    if (boxHeight > canvas.height) {
        offsetY = Math.min((boxHeight - canvas.height) / 2, Math.max(-(boxHeight - canvas.height) / 2, offsetY));
    } else {
        offsetY = 0;
    }
}

// Desenha a imagem e o twibbon no canvas
function draw() {
    // Cancela qualquer animação pendente
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    
    // Usa requestAnimationFrame para animação suave
    animationFrameId = requestAnimationFrame(() => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (img) {
            ctx.save();
            // Centraliza e aplica transformações
            ctx.translate(canvas.width / 2 + offsetX, canvas.height / 2 + offsetY);
            ctx.rotate(rotation);
            
            // Calcula dimensões considerando rotação
            const rad = Math.abs(rotation);
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);
            const coverScale = 1.2 / Math.max(cos, sin);
            
            const drawWidth = img.width * scale * coverScale;
            const drawHeight = img.height * scale * coverScale;
            
            // Desenha a imagem do usuário
            ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
            ctx.restore();
        }
        
        // Desenha o twibbon por cima
        if (twibbon.complete && twibbon.naturalHeight !== 0) {
            ctx.drawImage(twibbon, 0, 0, canvas.width, canvas.height);
        }
    });
}

// Funções para arrastar a imagem
function startDrag(e) {
    if (!img) return;
    isDragging = true;
    startX = e.clientX || e.touches[0].clientX;
    startY = e.clientY || e.touches[0].clientY;
    e.preventDefault();
}

function drag(e) {
    if (!isDragging || !img) return;
    
    const currentX = e.clientX || e.touches[0].clientX;
    const currentY = e.clientY || e.touches[0].clientY;
    
    offsetX += (currentX - startX) * 1.5;
    offsetY += (currentY - startY) * 1.5;
    
    startX = currentX;
    startY = currentY;
    
    constrainOffsets();
    draw();
    e.preventDefault();
}

function endDrag() {
    isDragging = false;
}

// Versões para touch (mobile)
let initialDistance = null;

function handleTouchStart(e) {
    e.preventDefault();
    if (e.touches.length === 1) {
        isDragging = true;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
        // Calcula distância inicial para zoom
        initialDistance = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
        );
    }
}

function handleTouchMove(e) {
    e.preventDefault();
    
    // ZOOM COM DOIS DEDOS
    if (e.touches.length === 2) {
        const currentDistance = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
        );
        
        if (initialDistance) {
            const scaleFactor = currentDistance / initialDistance;
            const newZoom = parseInt(zoomSlider.value) * scaleFactor;
            zoomSlider.value = Math.min(200, Math.max(100, newZoom));
            updateZoom(zoomSlider.value);
        }
        initialDistance = currentDistance;
    } 
    // ARRASTE
    else if (isDragging) {
        const currentX = e.touches[0].clientX;
        const currentY = e.touches[0].clientY;
        
        offsetX += (currentX - startX) * 1.2; // Mais suave
        offsetY += (currentY - startY) * 1.2;
        
        startX = currentX;
        startY = currentY;
        constrainOffsets();
        draw();
    }
}

function handleTouchEnd() {
    isDragging = false;
    initialDistance = null;
}

// Controles por teclado para acessibilidade
function handleKeyDown(e) {
    if (!img) return;
    
    const STEP = 10;
    const ROTATION_STEP = 5;
    
    switch(e.key) {
        case 'ArrowUp': offsetY -= STEP; break;
        case 'ArrowDown': offsetY += STEP; break;
        case 'ArrowLeft': offsetX -= STEP; break;
        case 'ArrowRight': offsetX += STEP; break;
        case '[':
            rotation -= ROTATION_STEP * Math.PI / 180;
            rotateSlider.value = rotation * 180 / Math.PI;
            rotationValue.textContent = `${Math.round(rotation * 180 / Math.PI)}°`;
            break;
        case ']':
            rotation += ROTATION_STEP * Math.PI / 180;
            rotateSlider.value = rotation * 180 / Math.PI;
            rotationValue.textContent = `${Math.round(rotation * 180 / Math.PI)}°`;
            break;
        case '-':
            if (zoomSlider.value > zoomSlider.min) {
                zoomSlider.value = parseInt(zoomSlider.value) - 5;
                updateZoom(zoomSlider.value);
            }
            break;
        case '+':
        case '=':
            if (zoomSlider.value < zoomSlider.max) {
                zoomSlider.value = parseInt(zoomSlider.value) + 5;
                updateZoom(zoomSlider.value);
            }
            break;
        case 'r': case 'R': resetImage(); break;
        default: return;
    }
    
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', '[', ']'].includes(e.key)) {
        constrainOffsets();
        draw();
    }
    e.preventDefault();
}

// Reseta a imagem para o estado inicial
function resetImage() {
    if (!originalImageData) return;
    
    scale = originalImageData.scale;
    rotation = originalImageData.rotation;
    offsetX = originalImageData.offsetX;
    offsetY = originalImageData.offsetY;
    
    zoomSlider.value = Math.round((scale / minScale) * 100);
    rotateSlider.value = Math.round(rotation * 180 / Math.PI);
    
    zoomValue.textContent = `${zoomSlider.value}%`;
    rotationValue.textContent = `${rotateSlider.value}°`;
    
    draw();
}

// Compartilha no LinkedIn
function shareOnLinkedIn() {
    const texto = `🟢 Eu apoio o Abril Verde! Segurança no trabalho é compromisso de todos. 💪🏽 Junte-se a mim nessa causa e mostre seu apoio! Quanto mais pessoas conscientes, mais vidas protegidas. 🚧 #AbrilVerdeMontarsul`;
    
    // Passo 1: Cria um textarea invisível com o texto
    const textarea = document.createElement('textarea');
    textarea.value = texto;
    textarea.style.position = 'fixed';
    textarea.style.opacity = 0;
    document.body.appendChild(textarea);
    
    // Passo 2: Copia para área de transferência
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    
    // Passo 3: Abre o compartilhamento
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`;
    
    // Tenta abrir no app
    window.location.href = `linkedin://shareArticle?mini=true&url=${encodeURIComponent(window.location.href)}`;
    
    // Fallback para web
    setTimeout(() => {
        const linkedinWindow = window.open(url, '_blank');
        
        // Cola automaticamente após 1.5s (tempo para carregar)
        setTimeout(() => {
            linkedinWindow.postMessage({
                type: 'PASTE_TEXT',
                text: texto
            }, '*');
        }, 1500);
    }, 300);
    
    // Mostra confirmação
    alert('Texto copiado! Cole no LinkedIn quando abrir.');
}

// Baixa a imagem
function downloadImage() {
    if (!img) return;
    
    showLoading(true);
    
    // Usa setTimeout para dar tempo da UI atualizar
    setTimeout(() => {
        try {
            // Cria um canvas temporário com maior resolução
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            const downloadSize = 1080; // Tamanho grande para boa qualidade
            
            tempCanvas.width = downloadSize;
            tempCanvas.height = downloadSize;
            
            // Ajusta as transformações para o novo tamanho
            const scaleRatio = downloadSize / canvasSize;
            const downloadScale = scale * scaleRatio;
            const downloadOffsetX = offsetX * scaleRatio;
            const downloadOffsetY = offsetY * scaleRatio;
            
            // Aplica as mesmas transformações
            tempCtx.save();
            tempCtx.translate(downloadSize / 2 + downloadOffsetX, downloadSize / 2 + downloadOffsetY);
            tempCtx.rotate(rotation);
            
            const rad = Math.abs(rotation);
            const coverScale = 1.2 / Math.max(Math.cos(rad), Math.sin(rad));
            const drawWidth = img.width * downloadScale * coverScale;
            const drawHeight = img.height * downloadScale * coverScale;
            
            // Desenha a imagem do usuário
            tempCtx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
            tempCtx.restore();
            
            // Desenha o twibbon por cima
            tempCtx.drawImage(twibbon, 0, 0, downloadSize, downloadSize);
            
            // Salva a imagem gerada para compartilhamento
            lastGeneratedImage = tempCanvas.toDataURL('image/png');
            
            // Cria o link de download
            const link = document.createElement('a');
            link.download = 'montarsul-abril-verde.png';
            link.href = lastGeneratedImage;
            link.click();
            
            // Mostra o modal de compartilhamento
            showModal(lastGeneratedImage);
            showLoading(false);
        } catch (error) {
            console.error('Erro ao gerar imagem:', error);
            showError('Erro ao gerar imagem');
            showLoading(false);
        }
    }, 100);
}

// Mostra o modal com a imagem gerada
function showModal(imageData) {
    modalPreview.src = imageData;
    shareModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    linkedinBtn.style.display = 'flex'; // Mostra o botão "Voltar para o post"
}

// Fecha o modal
function closeModal() {
    shareModal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Mostra/oculta o loading
function showLoading(show) {
    loadingOverlay.style.display = show ? 'flex' : 'none';
}

// Mostra mensagens de erro
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    setTimeout(hideError, 5000);
}

function hideError() {
    errorMessage.style.display = 'none';
}

// Configura os sliders para atualizarem a imagem
zoomSlider.addEventListener('input', function() {
    updateZoom(this.value);
});

rotateSlider.addEventListener('input', function() {
    updateRotation(this.value);
});

// Inicializa a aplicação quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', init);
