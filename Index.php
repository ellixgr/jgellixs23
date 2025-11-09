
<?php
// Tenta ler os dados do arquivo (simulando um "banco de dados")
$data = @file_get_contents('data.txt');
if ($data === FALSE || empty($data)) {
    // Valores padrão se o arquivo não existir ou estiver vazio
    $product_name = "Produto Padrão (Use o ADM para mudar!)";
    $tiktok_link = "#";
    $image_urls = ["https://via.placeholder.com/400x400?text=Sem+Foto"];
} else {
    $product = json_decode($data, true);
    $product_name = $product['product_name'] ?? "Erro no Nome";
    $tiktok_link = $product['tiktok_link'] ?? "#";
    $image_urls = explode("\n", trim($product['image_urls'])); // Transforma as linhas em um array
}

// Função para gerar as tags <img> para o carrossel
function generate_images($urls) {
    $html = "";
    $count = 1;
    foreach ($urls as $url) {
        $clean_url = trim($url);
        if (!empty($clean_url)) {
            $html .= '<img class="product-image" src="' . htmlspecialchars($clean_url) . '" alt="Foto ' . $count++ . ' do Produto">';
        }
    }
    return $html;
}
?>

<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Minha Loja TikTok Shop</title>
    <style>
        /* ... Seu CSS completo aqui ... */
        body {
            font-family: sans-serif;
            background-color: #f0f2f5;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
        }

        .product-card {
            background-color: #fff;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            max-width: 400px;
            width: 90%;
            padding: 20px;
            text-align: center;
        }

        .product-title {
            color: #333;
            font-size: 1.5em;
            margin-bottom: 10px;
        }

        .image-carousel {
            position: relative;
            width: 100%;
            overflow: hidden;
            border-radius: 8px;
            margin-bottom: 15px;
        }

        .image-container {
            display: flex;
            transition: transform 0.3s ease-in-out;
        }

        .product-image {
            min-width: 100%;
            height: auto;
            display: block;
        }

        .nav-button {
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            background: rgba(0, 0, 0, 0.5);
            color: white;
            border: none;
            padding: 10px;
            cursor: pointer;
            z-index: 10;
            user-select: none;
            border-radius: 50%;
            font-size: 1.2em;
        }

        .nav-button.prev {
            left: 10px;
        }

        .nav-button.next {
            right: 10px;
        }

        .buy-button {
            display: inline-block;
            background-color: #fe2c55;
            color: white;
            padding: 12px 25px;
            text-decoration: none;
            border-radius: 50px;
            font-weight: bold;
            font-size: 1.1em;
            transition: background-color 0.3s;
            border: none;
            cursor: pointer;
        }

        .buy-button:hover {
            background-color: #d12749;
        }
    </style>
</head>
<body>

    <div class="product-card">
        <h2 class="product-title"><?php echo htmlspecialchars($product_name); ?></h2>

        <div class="image-carousel">
            <div class="image-container" id="imageContainer">
                <?php echo generate_images($image_urls); ?>
            </div>
            
            <button class="nav-button prev" onclick="navigateCarousel(-1)">&#10094;</button>
            <button class="nav-button next" onclick="navigateCarousel(1)">&#10095;</button>
        </div>

        <a 
            class="buy-button" 
            href="<?php echo htmlspecialchars($tiktok_link); ?>" 
            target="_blank"
            rel="noopener noreferrer"
        >
            🛒 Comprar no TikTok Shop
        </a>
    </div>

    <script>
        const container = document.getElementById('imageContainer');
        // O JS agora precisa contar as imagens dinamicamente
        const images = container.querySelectorAll('.product-image'); 
        let currentIndex = 0;

        function navigateCarousel(direction) {
            currentIndex += direction;

            // Lógica para voltar ao início/fim
            if (currentIndex < 0) {
                currentIndex = images.length - 1;
            } else if (currentIndex >= images.length) {
                currentIndex = 0;
            }

            // Move o container horizontalmente
            const offset = -currentIndex * 100;
            container.style.transform = `translateX(${offset}%)`;
        }
        
        // Se houver apenas 1 imagem, esconde os botões de navegação
        if (images.length <= 1) {
            document.querySelectorAll('.nav-button').forEach(button => button.style.display = 'none');
        }
    </script>

</body>
</html>
