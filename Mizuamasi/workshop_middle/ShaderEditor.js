// ShaderEditor.js

class ShaderEditor {
    constructor(options) {
        // オプションのデフォルト値を設定
        const defaults = {
            container: document.body,
            width: 800,
            height: 600,
            initialCode: '', // 初期のシェーダーコード
        };
        this.options = { ...defaults, ...options };

        // コンテナ要素の設定
        this.container = this.options.container;

        // 必要なプロパティの初期化
        this.editor = null;
        this.renderer = null;
        this.scene = null;
        this.camera = null;
        this.uniforms = {};
        this.debugInfo = {};
        this.material = null;
        this.mesh = null;

        // 初期化メソッドの呼び出し
        this.init();
    }

    init() {
        // エディターとレンダラー用のDOM要素を作成
        this.createDomElements();

        // エディターの初期化
        this.initEditor();

        // Three.jsの初期化
        this.initThreeJS();

        // イベントリスナーの設定
        this.initEventListeners();
    }

    createDomElements() {
        // コンテナのスタイルを設定
        this.container.style.position = 'relative';
        this.container.style.width = this.options.width + 'px';
        this.container.style.height = this.options.height + 'px';

        // エディターのラッパー要素を作成
        this.editorWrapper = document.createElement('div');
        this.editorWrapper.style.position = 'absolute';
        this.editorWrapper.style.top = '0';
        this.editorWrapper.style.left = '0';
        this.editorWrapper.style.width = '100%';
        this.editorWrapper.style.height = '100%';
        this.editorWrapper.style.pointerEvents = 'none'; // エディターの背景として機能させる

        // レンダラー用のキャンバス要素を作成
        this.canvas = document.createElement('canvas');
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.zIndex = '-1'; // 背景として配置

        // エディター用のテキストエリアを作成
        this.textarea = document.createElement('textarea');
        this.container.appendChild(this.canvas);
        this.container.appendChild(this.textarea);
    }

    initEditor() {
        // CodeMirrorを使用してエディターを初期化
        this.editor = CodeMirror.fromTextArea(this.textarea, {
            value: this.options.initialCode,
            mode: 'x-shader/x-fragment',
            lineNumbers: true,
            theme: 'default',
        });

        // エディターのスタイルを設定
        this.editor.setSize('100%', '100%');
        this.editor.getWrapperElement().style.backgroundColor = 'transparent';
        this.editor.getWrapperElement().style.position = 'relative';
        this.editor.getWrapperElement().style.zIndex = '1';

        // エディターの変更イベント
        this.editor.on('change', () => {
            this.updateShader();
        });
    }

    // ShaderEditor.js
export class ShaderEditor {
    // クラスの内容はそのまま（以下に修正点を示します）

    // コンストラクタとその他のメソッド...

    initThreeJS() {
        // レンダラーの作成
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas });
        this.renderer.setSize(this.options.width, this.options.height);

        // シーンとカメラの作成
        this.scene = new THREE.Scene();
        this.camera = new THREE.Camera();

        // 平面ジオメトリとマテリアルの作成
        const geometry = new THREE.PlaneGeometry(2, 2);
        this.uniforms = {
            u_time: { value: 1.0 },
            u_resolution: { value: new THREE.Vector2(this.options.width, this.options.height) },
            u_mouse: { value: new THREE.Vector2(0.0, 0.0) },
            u_debugIndex: { value: 0 },
            u_debugValue: { value: new THREE.Vector4(0, 0, 0, 0) },
        };

        this.material = new THREE.ShaderMaterial({
            uniforms: this.uniforms,
            fragmentShader: this.editor.getValue(),
        });

        // メッシュの作成とシーンへの追加
        this.mesh = new THREE.Mesh(geometry, this.material);
        this.scene.add(this.mesh);

        // レンダリングの開始
        this.animate();
    }

    transformPrintFunctions(code) {
        // シェーダーコードの解析と`print`関数の置換
        let printIndex = 0;
        const lines = code.split('\n');
        const transformedLines = [];
        lines.forEach((line) => {
            const printRegex = /print\s*\(\s*(.+?)\s*(,\s*(.+?)\s*)?\)\s*;/;
            const match = line.match(printRegex);
            if (match) {
                const variable = match[1];
                const coord = match[3] ? match[3] : 'gl_FragCoord.xy';
                // デバッグ情報を特定のピクセルに出力
                transformedLines.push(`
                    if (int(gl_FragCoord.x) == ${printIndex} && int(gl_FragCoord.y) == 0) {
                        gl_FragColor = vec4(${variable}, 1.0);
                        return;
                    }
                `);
                printIndex++;
            } else {
                transformedLines.push(line);
            }
        });

        // デバッグ用のフラグメントシェーダーコードを生成
        const transformedCode = transformedLines.join('\n');
        return transformedCode;
    }

    animate() {
        // レンダリングループ
        requestAnimationFrame(this.animate.bind(this));
        this.uniforms.u_time.value += 0.05;
        this.renderer.render(this.scene, this.camera);

        // デバッグ情報の取得
        this.getDebugInfo();
    }

    getDebugInfo() {
        // デバッグ情報が出力されたピクセルを読み取る
        const gl = this.renderer.getContext();
        const pixelBuffer = new Uint8Array(4);
        gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixelBuffer);

        // デバッグ情報を表示
        const debugValue = Array.from(pixelBuffer).map((v) => v / 255);
        this.displayDebugInfo(debugValue);
    }

    displayDebugInfo(debugValue) {
        // デバッグ情報をウェブページ内に表示
        if (!this.debugElement) {
            this.debugElement = document.createElement('div');
            this.debugElement.style.position = 'absolute';
            this.debugElement.style.bottom = '0';
            this.debugElement.style.left = '0';
            this.debugElement.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
            this.debugElement.style.color = 'white';
            this.debugElement.style.padding = '5px';
            this.container.appendChild(this.debugElement);
        }
        this.debugElement.textContent = `Debug Value: (${debugValue.join(', ')})`;
    }
}
