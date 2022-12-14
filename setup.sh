echo "try to install baileys module ..."
git clone https://github.com/adiwajshing/Baileys && cd Baileys && yarn install && tsc && cd ..
echo "try to installing modules ..."
npm install
echo "setup done!"
echo "to run script type: npm start"