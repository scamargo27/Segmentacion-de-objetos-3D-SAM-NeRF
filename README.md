# Segmentación deo bjetos 3D con SAM-NeRF

## **INSTALACIÓN**

Debido a que SAM-NeRF requiere varias dependencias específicas, se recomienda crear un enviroment mediante [Anaconda](https://www.anaconda.com/download/success) para su implementación.

### **1. Creación del enviroment**
```
conda create --name samnerf -y python=3.10
conda activate samnerf
python -m pip install --upgrade pip
```
### **2. Clona el repositorio e instala los paquetes requeridos**
```
git clone https://github.com/scamargo27/Segmentacion-de-objetos-3D-SAM-NeRF.git Explore-Sam-in-NeRF
cd Explore-Sam-in-NeRF
pip install -r requirements.txt
``` 
### **3. Descarga modelos pre-entrenados**

Para el modelo CLIPseg preentrenado:
```
cd samnerf/clipseg
wget https://owncloud.gwdg.de/index.php/s/ioHbRzFx6th32hn/download -O weights.zip
unzip -d weights -j weights.zip
```
Para el modelo SAM correspondiente:

```
cd samnerf/segment-anything
wget https://dl.fbaipublicfiles.com/segment_anything/sam_vit_b_01ec64.pth
wget https://dl.fbaipublicfiles.com/segment_anything/sam_vit_h_4b8939.pth
```
### **4. Aloja tu propio visor**

Asegúrate de tener _"viser"_ instalado.

```
pip install viser==0.0.5
```

Además, asegúrate de que node.js y yarn estén disponibles en tu equipo. Consulta [aquí](https://www.digitalocean.com/community/tutorials/how-to-install-node-js-on-ubuntu-20-04)  para saber cómo instalar node.js.

Ejecuta los siguientes comandos para tener tu propio visor en tu pc.

```
cd nerfstudio/viewer/app
yarn
yarn start
```

Después de compilar, el visor está disponible en la siguiente url: http://localhost:4000/?websocket_url=ws://localhost:7007

**Nota:** Tenga en cuenta que cada vez que quiera visualizar el entrenamiento o los resultados de alguna escena debe ejecutar los comandos de yarn en una consola en paralelo al proceso deseado.

## ENTRENA TU PRIMER MODELO 

Puedes entrenar con diversas escenas optimizadas del Dataset de [Mip-NeRF 360](https://jonbarron-info.translate.goog/mipnerf360/?_x_tr_sl=en&_x_tr_tl=es&_x_tr_hl=es&_x_tr_pto=tc).

Descarga el contenido del mismo mediante el script de nuestro repositorio.

```
bash dataset.sh
```
**¿Eres parte de la comunidad UIS?** Puedes probar con nuestras escenas [Cubículo de Biblioteca-UIS]() y [Auditorio Ágora-UIS]()

**_Atención:_** Si no deseas trabajar con ninguna de estas escenas, asegúrate de crear la ruta _/data/machine/data/mipnerf360_. En esta carpeta _(mipnerf360)_ deberán ser almacenadas las escenas con las que deseas implementar el modelo SAM-NeRF.

Una vez seleccionada la escena a entrenar, realiza un preprocesamiento de datos para obtener los archivos json necesarios para entrenar Nerf en Nerfstudio:
```
#replace "scene" with your scene name
bash samnerf/preprocessing/mipnerf360.sh scene json
```

``` 
python -m samnerf.train samnerf_no_distill   --data /data/machine/data/mipnerf360/room   --vis viewer+wandb   --viewer.websocket-port 7007
``` 
