// Elementos do DOM
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

// Variáveis de estado
let img = null;
let twibbon = new Image();
let minScale = 1;
let scale = 1;
let rotation = 0;
let offsetX = 0;
let offsetY = 0;
let isDragging = false;
let startX, startY;
let canvasSize;
let lastGeneratedImage = null;
let animationFrameId = null;
let originalImageData = null;

// Inicialização
function init() {
    setupCanvas();
    setupEventListeners();
    drawInitialCanvas();
    loadTwibbon();
}

// Configura o canvas responsivo
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
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
}

// Desenha o estado inicial do canvas
function drawInitialCanvas() {
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    if (twibbon.complete && twibbon.naturalHeight !== 0) {
        ctx.drawImage(
            twibbon,
            0,
            0,
            canvas.width,
            canvas.height
        );
    }
    
    // Mensagem central melhorada
    ctx.fillStyle = '#005b24';
    ctx.font = 'bold 14px "Gill Sans", sans-serif'; // Tamanho reduzido e fonte específica
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle'; // Centraliza verticalmente
    ctx.fillText('Sua imagem aparecerá aqui', canvas.width/2, canvas.height/2);
}

// Carrega o twibbon
function loadTwibbon() {
    twibbon.src = 'assets/twibbon.png';
    twibbon.onload = function() {
        drawInitialCanvas();
    };
    twibbon.onerror = function() {
        console.error('Erro ao carregar o twibbon');
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
    fileInput.addEventListener('change', handleUpload);
    
    // Eventos de mouse
    canvas.addEventListener('mousedown', startDrag);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', endDrag);
    
    // Eventos de toque melhorados para mobile
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
    
    // Eventos de teclado
    document.addEventListener('keydown', handleKeyDown);
    
    // Botões
    downloadBtn.addEventListener('click', downloadImage);
    resetBtn.addEventListener('click', resetImage);
    shareBtn.addEventListener('click', shareOnLinkedIn);
    
    // Botão de voltar para o post
    linkedinBtn.addEventListener('click', function() {
        window.open('http://linkedin.com/company/montarsul-group/', '_blank');
    });
    
    // Sliders com eventos touch melhorados
    zoomSlider.addEventListener('input', function() {
        updateZoom(this.value);
    });
    
    rotateSlider.addEventListener('input', function() {
        updateRotation(this.value);
    });
    
    // Adiciona eventos touch para os sliders
    zoomSlider.addEventListener('touchstart', function(e) {
        e.stopPropagation();
    }, { passive: true });
    
    rotateSlider.addEventListener('touchstart', function(e) {
        e.stopPropagation();
    }, { passive: true });
}

// Manipula o upload da imagem
function handleUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.match('image.*')) {
        showError('Por favor, selecione um arquivo de imagem válido (JPEG, PNG)');
        return;
    }

    showLoading(true);
    
    const reader = new FileReader();
    reader.onload = function(e) {
        img = new Image();
        img.onload = function() {
            const scaleX = canvasSize / img.width;
            const scaleY = canvasSize / img.height;
            minScale = Math.max(scaleX, scaleY);
            scale = minScale;
            offsetX = 0;
            offsetY = 0;
            rotation = 0;
            
            zoomSlider.value = 100;
            rotateSlider.value = 0;
            zoomValue.textContent = '100%';
            rotationValue.textContent = '0°';
            
            controls.style.display = 'flex';
            downloadBtn.disabled = false;
            resetBtn.disabled = false;
            linkedinBtn.style.display = 'none';
            
            originalImageData = {
                scale: scale,
                rotation: rotation,
                offsetX: offsetX,
                offsetY: offsetY
            };
            
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

// Atualiza o zoom
function updateZoom(value) {
    scale = minScale * (value / 100);
    zoomValue.textContent = `${value}%`;
    constrainOffsets();
    draw();
}

// Atualiza a rotação
function updateRotation(value) {
    rotation = value * Math.PI / 180;
    rotationValue.textContent = `${value}°`;
    constrainOffsets();
    draw();
}

// Garante que a imagem não saia dos limites
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

// Desenha a imagem e o twibbon
function draw() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    
    animationFrameId = requestAnimationFrame(() => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (img) {
            ctx.save();
            ctx.translate(canvas.width / 2 + offsetX, canvas.height / 2 + offsetY);
            ctx.rotate(rotation);
            
            const rad = Math.abs(rotation);
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);
            const coverScale = 1.2 / Math.max(cos, sin);
            
            const drawWidth = img.width * scale * coverScale;
            const drawHeight = img.height * scale * coverScale;
            
            ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
            ctx.restore();
        }
        
        if (twibbon.complete && twibbon.naturalHeight !== 0) {
            ctx.drawImage(twibbon, 0, 0, canvas.width, canvas.height);
        }
    });
}

// Funções para arrastar a imagem
function startDrag(e) {
    if (!img) return;
    isDragging = true;
    const clientX = e.clientX || e.touches[0].clientX;
    const clientY = e.clientY || e.touches[0].clientY;
    startX = clientX - offsetX;
    startY = clientY - offsetY;
    e.preventDefault();
}

function drag(e) {
    if (!isDragging || !img) return;
    
    const clientX = e.clientX || e.touches[0].clientX;
    const clientY = e.clientY || e.touches[0].clientY;
    
    offsetX = clientX - startX;
    offsetY = clientY - startY;
    
    constrainOffsets();
    draw();
    e.preventDefault();
}

function endDrag() {
    isDragging = false;
}

// Versões para touch melhoradas
function handleTouchStart(e) {
    startDrag(e);
}

function handleTouchMove(e) {
    drag(e);
}

function handleTouchEnd() {
    endDrag();
}

// Controles por teclado
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

// Reseta a imagem
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

// Compartilha no LinkedIn - versão melhorada para mobile
function shareOnLinkedIn() {
    if (!lastGeneratedImage) {
        showError('Por favor, gere uma imagem primeiro');
        return;
    }
    
    const text = "🟢 Eu apoio o Abril Verde! Segurança no trabalho é compromisso de todos. 💪🏽 Junte-se a mim nessa causa e mostre seu apoio! Quanto mais pessoas conscientes, mais vidas protegidas. 🚧 #AbrilVerdeMontarsul";
    
    // Verifica se é mobile
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
        // Tenta abrir diretamente no app do LinkedIn
        const linkedinAppUrl = `linkedin://share?text=${encodeURIComponent(text)}`;
        window.location.href = linkedinAppUrl;
        
        // Fallback para web se o app não estiver instalado
        setTimeout(() => {
            window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(text)}`, '_blank');
        }, 500);
    } else {
        // Desktop - abre normalmente
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(text)}`, '_blank');
    }
}

// Baixa a imagem
function downloadImage() {
    if (!img) return;
    
    showLoading(true);
    
    setTimeout(() => {
        try {
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            const downloadSize = 1080;
            
            tempCanvas.width = downloadSize;
            tempCanvas.height = downloadSize;
            
            const scaleRatio = downloadSize / canvasSize;
            const downloadScale = scale * scaleRatio;
            const downloadOffsetX = offsetX * scaleRatio;
            const downloadOffsetY = offsetY * scaleRatio;
            
            tempCtx.save();
            tempCtx.translate(downloadSize / 2 + downloadOffsetX, downloadSize / 2 + downloadOffsetY);
            tempCtx.rotate(rotation);
            
            const rad = Math.abs(rotation);
            const coverScale = 1.2 / Math.max(Math.cos(rad), Math.sin(rad));
            const drawWidth = img.width * downloadScale * coverScale;
            const drawHeight = img.height * downloadScale * coverScale;
            
            tempCtx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
            tempCtx.restore();
            
            tempCtx.drawImage(twibbon, 0, 0, downloadSize, downloadSize);
            
            lastGeneratedImage = tempCanvas.toDataURL('image/png');
            
            const link = document.createElement('a');
            link.download = 'montarsul-abril-verde.png';
            link.href = lastGeneratedImage;
            link.click();
            
            showModal(lastGeneratedImage);
            showLoading(false);
        } catch (error) {
            console.error('Erro ao gerar imagem:', error);
            showError('Erro ao gerar imagem');
            showLoading(false);
        }
    }, 100);
}

// Mostra o modal
function showModal(imageData) {
    modalPreview.src = imageData;
    shareModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    linkedinBtn.style.display = 'flex';
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

// Inicializa a aplicação
document.addEventListener('DOMContentLoaded', init);