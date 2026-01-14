#!/bin/bash
# Lanceur simple (macOS) pour démarrer le serveur local et ouvrir l'app dans le navigateur.
# Double-clique dessus pour lancer.

cd "$(dirname "$0")"

# Démarre le serveur Node (ouvre automatiquement le navigateur grâce à local-server.mjs)
# Si Node n'est pas installé, tente d'utiliser Python.

NODE_CMD="node"
SERVER_SCRIPT="local-server.mjs"
PORT=4173

# Vérifie si Node est disponible
if command -v $NODE_CMD &> /dev/null; then
    echo "Node détecté. Lancement du serveur..."
    $NODE_CMD $SERVER_SCRIPT
else
    echo "Node non trouvé. Tentative avec Python..."
    # Ouvre le navigateur manuellement car le module http.server ne le fait pas nativement comme notre script Node
    open "http://localhost:$PORT"
    # Essaie python3 ou python
    if command -v python3 &> /dev/null; then
        python3 -m http.server $PORT
    elif command -v python &> /dev/null; then
        python -m http.server $PORT
    else
        echo "Erreur : Ni Node.js ni Python n'ont été trouvés."
        echo "Veuillez installer Node.js ou Python pour lancer cette application."
    fi
fi

# Laisse la fenêtre ouverte pour arrêter proprement avec Ctrl+C si besoin.
echo ""
echo "Serveur arrêté. Fermez cette fenêtre."
