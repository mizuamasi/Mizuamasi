let scenes = {};

/**
 * Three.jsのシーンを初期化します。
 * @param {string} containerId - シェーダーデモを表示するコンテナのID
 */
function initThree(containerId) {
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.position.z = 1;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Container with id ${containerId} not found`);
        return;
    }
    container.innerHTML = ''; // 既存のコンテンツをクリア
    container.appendChild(renderer.domElement);

    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.ShaderMaterial({
        uniforms: {
            iTime: { value: 0 },
            iResolution: { value: new THREE.Vector3() },
            showCoordinates: { value: false }
        },
        vertexShader: `
            void main() {
                gl_Position = vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform vec3 iResolution;
            uniform float iTime;
            uniform bool showCoordinates;

            void mainImage(out vec4 fragColor, in vec2 fragCoord) {
                vec2 uv = fragCoord / iResolution.xy;
                vec3 col = 0.5 + 0.5 * sin(iTime + uv.xyx + vec3(0, 2, 4));

                if(showCoordinates){
                    col = vec3(uv, 0.5 + 0.5 * sin(iTime));
                }

                fragColor = vec4(col, 1.0);
            }

            void main() {
                mainImage(gl_FragColor, gl_FragCoord.xy);
            }
        `
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const size = getContainerSize(containerId);
    renderer.setSize(size.width, size.height);
    material.uniforms.iResolution.value.set(size.width, size.height, 1);

    scenes[containerId] = { scene, camera, renderer, material, startTime: performance.now() };

    window.addEventListener('resize', () => updateRendererSize(containerId));

    // シェーダーのコンパイルエラーをチェック
    checkShaderCompilation(renderer, material, containerId);

    // アニメーションループを開始
    animate(containerId);
}

/**
 * アニメーションループを開始します。
 * @param {string} containerId - シェーダーデモを表示するコンテナのID
 */
function animate(containerId) {
    if (!scenes[containerId]) return;
    
    const { scene, camera, renderer, material, startTime } = scenes[containerId];
    
    function render() {
        const currentTime = performance.now();
        const elapsedTime = (currentTime - startTime) / 1000; // 秒単位
        
        // uniformのiTimeを更新
        material.uniforms.iTime.value = elapsedTime;
        
        renderer.render(scene, camera);
        requestAnimationFrame(render);
    }
    
    render();
}

/**
 * シェーダーのコンパイルエラーをチェックします。
 * @param {THREE.WebGLRenderer} renderer - レンダラー
 * @param {THREE.ShaderMaterial} material - マテリアル
 * @param {string} containerId - コンテナID
 */
function checkShaderCompilation(renderer, material, containerId) {
    const gl = renderer.getContext();

    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, material.vertexShader);
    gl.compileShader(vertexShader);
    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
        const error = gl.getShaderInfoLog(vertexShader);
        console.error(`Vertex Shader Error in ${containerId}:`, error);
        return;
    }

    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, material.fragmentShader);
    gl.compileShader(fragmentShader);
    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
        const error = gl.getShaderInfoLog(fragmentShader);
        const errorId = `error-${containerId.split('-').pop()}`;
        document.getElementById(errorId).textContent = `エラー: ${error}`;
        console.error(`Fragment Shader Error in ${containerId}:`, error);
    } else {
        const errorId = `error-${containerId.split('-').pop()}`;
        document.getElementById(errorId).textContent = '';
    }

    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
}

/**
 * コンテナのサイズを取得します。
 * @param {string} containerId - コンテナのID
 * @returns {object} - 幅と高さ
 */
function getContainerSize(containerId) {
    const container = document.getElementById(containerId);
    return {
        width: container.clientWidth,
        height: container.clientHeight
    };
}

// common.js

/**
 * レンダラーのサイズを更新します。
 * @param {string} containerId - コンテナのID
 */
function updateRendererSize(containerId) {
    if (!scenes[containerId]) return;

    const { renderer, material } = scenes[containerId];
    const size = getContainerSize(containerId);

    renderer.setSize(size.width, size.height);
    
    // 現在の n の値を取得する
    const control = document.querySelector(`#${containerId} .controls input[type="range"]`);
    const n = control ? parseFloat(control.value) : 1;

    const width = size.width;
    const height = size.height;
    const minSide = Math.min(width, height);
    const aspect = width / height;
    
    const iResolutionX = minSide / n;
    const iResolutionY = aspect >= 1 ? (iResolutionX / aspect) : (iResolutionX * aspect);

    material.uniforms.iResolution.value.set(iResolutionX, iResolutionY, 1);
}

/**
 * シェーダーデモをロードします。
 * @param {string} type - デモのタイプ（例: 'gradient', 'basic', 'vj', 'coordinates', 'shape', 'animation', 'pixel'）
 * @param {string} containerId - シェーダーデモを表示するコンテナのID
 */
function loadShaderDemo(type, containerId) {
    if (!scenes[containerId]) {
        initThree(containerId);
    }

    const { material } = scenes[containerId];
    let newFragmentShader = '';
    switch(type) {
        case 'gradient':
            newFragmentShader = `
uniform vec3 iResolution;
uniform float iTime;
uniform bool showCoordinates;

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    vec3 color = vec3(uv.x, 0.5, 1.0 - uv.x);
    
    if(showCoordinates){
        color = vec3(uv, 0.5 + 0.5 * sin(iTime));
    }
    
    fragColor = vec4(color, 1.0);
}

void main() {
    mainImage(gl_FragColor, gl_FragCoord.xy);
}`;
            break;
        case 'animation':
            newFragmentShader = `
uniform vec3 iResolution;
uniform float iTime;
uniform bool showCoordinates;

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    float dist = length(uv - vec2(sin(iTime) * 0.5, 0.0));
    float radius = 0.2;
    float edge = 0.01;
    float alpha = smoothstep(radius, radius - edge, dist);
    vec3 color = mix(vec3(0.0, 0.0, 1.0), vec3(1.0), alpha);
    
    if(showCoordinates){
        color = vec3(uv, 0.5 + 0.5 * sin(iTime));
    }
    
    fragColor = vec4(color, 1.0);
}

void main() {
    mainImage(gl_FragColor, gl_FragCoord.xy);
}`;
            break;
        case 'coordinates':
            newFragmentShader = `
uniform vec3 iResolution;
uniform float iTime;
uniform bool showCoordinates;

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    // 中央を(0,0)にシフト
    vec2 centered = uv - 0.5;
    // グラデーションを中央から放射状に
    float dist = length(centered);
    vec3 color = vec3(dist, 0.5, 1.0 - dist);
    
    if(showCoordinates){
        color = vec3(uv, 0.5 + 0.5 * sin(iTime));
    }
    
    fragColor = vec4(color, 1.0);
}

void main() {
    mainImage(gl_FragColor, gl_FragCoord.xy);
}`;
            break;
        case 'shape':
            newFragmentShader = `
uniform vec3 iResolution;
uniform float iTime;
uniform bool showCoordinates;

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    float dist = length(uv);
    float radius = 0.3;
    float edge = 0.01;
    float alpha = smoothstep(radius, radius - edge, dist);
    vec3 color = mix(vec3(1.0, 0.0, 0.0), vec3(0.0), alpha);
    
    if(showCoordinates){
        color = vec3(uv, 0.5 + 0.5 * sin(iTime));
    }
    
    fragColor = vec4(color, 1.0);
}

void main() {
    mainImage(gl_FragColor, gl_FragCoord.xy);
}`;
            break;
        case 'pixel':
            newFragmentShader = `
uniform vec3 iResolution;
uniform float iTime;
uniform bool showCoordinates;

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    // 正規化座標に変換
    vec2 uv = fragCoord / iResolution.xy;
    
    // ピクセルの位置に基づいて色を決定
    vec3 color = vec3(uv, 0.5 + 0.5 * sin(iTime));
    
    if(showCoordinates){
        // 座標を色として表示
        color = vec3(uv, 0.5 + 0.5 * sin(iTime));
    }
    
    fragColor = vec4(color, 1.0);
}

void main() {
    mainImage(gl_FragColor, gl_FragCoord.xy);
}`;
            break;
        case 'vj':
            newFragmentShader = `
uniform vec3 iResolution;
uniform float iTime;
uniform bool showCoordinates;

//回転させる
mat2 rot(float a){return mat2(cos(a) , sin(a) ,-sin(a) , cos(a));}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    //0,0を真ん中らへんに
    uv = uv - 0.5;
    uv = floor(uv * 100.) / 100. ;
    //uvを回転させる　さらに中心からの距離におうじてちょっとずらす
    uv *= rot(iTime + length(uv) * 3. );
    // VJ向けの動的なビジュアル例
    vec3 color = 0.5 + 0.5 * sin(iTime * sin(uv.xyx * 10.0 ) + vec3(0, 2, 4));
    //赤色が0.5より大きいなら色全部に0をかける
    color.rgb *= step(color.r , 0.5);
    if(showCoordinates){
        color = vec3(uv, 0.5 + 0.5 * sin(iTime));
    }
    
    fragColor = vec4(color, 1.0);
}

void main() {
    mainImage(gl_FragColor, gl_FragCoord.xy);
}`;
            break;
        // 必要に応じて他のデモタイプも追加
        default:
            console.warn(`Unknown demo type: ${type}`);
            return;
    }
    material.fragmentShader = newFragmentShader;
    material.needsUpdate = true;

    // エディタの内容を更新
    const editorId = `editor-${containerId.split('-').pop()}`; // 例: 'shader-demo-animation' -> 'editor-animation'
    const errorId = `error-${containerId.split('-').pop()}`;
    const editorElement = document.getElementById(editorId);
    if (editorElement) {
        const editor = ace.edit(editorId);
        editor.setValue(newFragmentShader.trim(), -1); // カーソルを先頭に設定
    }

    // シェーダーのコンパイルエラーをチェック
    checkShaderCompilation(renderer, material, containerId);
}

/**
 * 指定されたデモタイプに応じてシェーダーを切り替えます。
 * @param {string} type - デモのタイプ
 * @param {string} containerId - シェーダーデモを表示するコンテナのID
 */
function showDemo(type, containerId) {
    loadShaderDemo(type, containerId);
}

/**
 * ページナビゲーションを構築します。
 * 各ページから隣のページやホームに移動できるようにします。
 */
function buildNavigationLinks(currentPageId) {
    const navContainer = document.createElement('div');
    navContainer.classList.add('navigation-links');

    // 前のページ
    const currentIndex = pages.findIndex(page => page.id === currentPageId);
    if (currentIndex > 0) {
        const prevPage = pages[currentIndex - 1];
        const prevLink = document.createElement('a');
        prevLink.href = `#${prevPage.id}`;
        prevLink.textContent = `← ${prevPage.title}`;
        prevLink.classList.add('nav-button');
        navContainer.appendChild(prevLink);
    }

    // ホームページリンク
    const homeLink = document.createElement('a');
    homeLink.href = '#intro';
    homeLink.textContent = '🏠 ホーム';
    homeLink.classList.add('nav-button');
    navContainer.appendChild(homeLink);

    // 次のページ
    if (currentIndex < pages.length - 1) {
        const nextPage = pages[currentIndex + 1];
        const nextLink = document.createElement('a');
        nextLink.href = `#${nextPage.id}`;
        nextLink.textContent = `${nextPage.title} →`;
        nextLink.classList.add('nav-button');
        navContainer.appendChild(nextLink);
    }

    // 現在のページのコンテンツの最後にナビゲーションリンクを追加
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
        const existingNav = mainContent.querySelector('.navigation-links');
        if (existingNav) {
            existingNav.remove();
        }
        mainContent.appendChild(navContainer);
    }
}

// ページ構成
const pages = [
    { id: 'intro', title: 'はじめに', file: 'intro.html' },
    { id: 'basics', title: 'シェーダーの基礎', file: 'basics.html' },
    { id: 'color-time', title: '色と時間の変化', file: 'color-time.html' },
    { id: 'coordinates', title: '座標系の理解', file: 'coordinates.html' },
    { id: 'shape', title: '形を作ろう', file: 'shape.html' },
    { id: 'animation', title: '動きのある形', file: 'animation.html' },
    { id: 'vj-intro', title: 'VJとは', file: 'vj-intro.html' },
    { id: 'workshop', title: 'ワークショップの流れ', file: 'workshop.html' },
    { id: 'resources', title: '学習リソース', file: 'resources.html' },
    { id: 'appendix', title: '付録: GLSL用語解説', file: 'appendix.html' }
];

/**
 * ナビゲーションの構築
 */
function buildNav() {
    const nav = document.getElementById('main-nav');
    nav.innerHTML = ''; // 既存のコンテンツをクリア
    pages.forEach(page => {
        const link = document.createElement('a');
        link.href = `#${page.id}`;
        link.textContent = page.title;
        link.classList.add('nav-link');
        nav.appendChild(link);
    });
}

/**
 * ページコンテンツのロード
 * @param {string} pageId - ロードするページのID
 */
async function loadPage(pageId) {
    const page = pages.find(p => p.id === pageId);
    if (!page) return;

    try {
        const response = await fetch(page.file);
        if (!response.ok) throw new Error(`Failed to load ${page.file}`);
        const content = await response.text();
        document.getElementById('main-content').innerHTML = content;

        // シェーダーデモの初期化
        initialize();

        // ナビゲーションリンクを再構築
        buildNavigationLinks(pageId);
    } catch (error) {
        console.error(error);
        document.getElementById('main-content').innerHTML = `<p>コンテンツの読み込みに失敗しました。</p>`;
    }
}

/**
 * ハッシュ変更時のページロード設定
 */
function setupHashChange() {
    window.addEventListener('hashchange', () => {
        const pageId = window.location.hash.slice(1) || 'intro';
        loadPage(pageId);
    });
}

/**
 * 初期化関数
 */
function init() {
    buildNav();
    setupHashChange();
    const initialPage = window.location.hash.slice(1) || 'intro';
    loadPage(initialPage);
}

// ページが読み込まれたら初期化を実行
document.addEventListener('DOMContentLoaded', init);
