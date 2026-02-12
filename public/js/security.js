/**
 * Escapa HTML especiais para prevenir XSS
 */
function escapeHtml(unsafe) {
    if (!unsafe || typeof unsafe !== 'string') return '';
    
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return unsafe.replace(/[&<>"']/g, char => map[char]);
}

/**
 * Cria elemento DOM seguro
 */
function createSafeElement(tag, attributes = {}, content = '') {
    const element = document.createElement(tag);
    
    // Aplicar atributos com segurança
    for (const [key, value] of Object.entries(attributes)) {
        if (typeof value === 'string') {
            element.setAttribute(key, escapeHtml(value));
        } else {
            element.setAttribute(key, value);
        }
    }
    
    // Aplicar conteúdo com segurança
    if (content) {
        element.textContent = content; // textContent não interpreta HTML
    }
    
    return element;
}

/**
 * Insere HTML seguro (apenas para estrutura confiável)
 */
function setSafeHtml(element, html) {
    element.innerHTML = DOMPurify.sanitize(html);
}