<?php
// Verifica se o formulário foi submetido via POST
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    
    // 1. Coleta e limpa os dados do formulário
    $product_name = trim($_POST['product_name']);
    $tiktok_link = trim($_POST['tiktok_link']);
    $image_urls = trim($_POST['image_urls']);
    
    // 2. Prepara os dados para salvar (usando JSON para organizar)
    $data_to_save = [
        'product_name' => $product_name,
        'tiktok_link' => $tiktok_link,
        'image_urls' => $image_urls
    ];
    
    $json_data = json_encode($data_to_save);
    
    // 3. Salva os dados no arquivo data.txt
    // FILE_PUT_CONTENTS é uma forma simples de salvar conteúdo em um arquivo.
    if (file_put_contents('data.txt', $json_data) !== FALSE) {
        $message = "Produto atualizado com sucesso! O site principal já está com as novas informações.";
        $success = true;
    } else {
        $message = "ERRO: Não foi possível salvar os dados. Verifique as permissões de escrita do arquivo data.txt.";
        $success = false;
    }
    
} else {
    // Se o acesso não foi via formulário POST
    $message = "Acesso inválido. Use o formulário de administração.";
    $success = false;
}

// Redireciona de volta para uma página de confirmação (ou usa o admin.html para exibir a mensagem)
// Para simplificar, vamos apenas exibir a mensagem de sucesso/erro:
?>

<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Resultado da Atualização</title>
</head>
<body>
    <h1>Resultado da Atualização</h1>
    <p><?php echo $message; ?></p>
    <a href="index.php">Ver Site Atualizado</a> | <a href="admin.html">Voltar para o ADM</a>
</body>
</html>
