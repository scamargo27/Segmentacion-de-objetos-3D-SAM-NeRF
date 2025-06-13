# Segmentación-de-objetos-3D-SAM-NeRF

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
``
