import { tr } from './translation';
import { genId, KEYS, imgToDataURL } from './utils';

let instance = null;
export default class Inserter {
  constructor() {
    this.pasteOptions = {
      replace_all: {
        internalName: 'fit',
        handle: (img) => {
          if(this.main.params.backplateImgUrl) {
            this.main.params.backplateImgUrl = undefined;
            this.main.tabelCell.style.background = '';
            this.main.params.backgroundFillColorAlpha = 1;
            this.main.canvas.style.backgroundColor = `${this.main.params.backgroundFillColor}ff`;
            console.log(this.main.params.backgroundFillColor)
          }
          this.main.fitImage(img, this.mimetype);
        }
      },
      paste_over: {
        internalName: 'over',
        handle: (img) => {
          this.tmpImg = img;
          const oldH = this.main.size.h;
          const oldW = this.main.size.w;
          if (img.naturalHeight <= oldH && img.naturalWidth <= oldW) {
            this.main.select.placeAt(
              0, 0,
              oldW - img.naturalWidth,
              oldH - img.naturalHeight, img);
          } else if (img.naturalWidth / img.naturalHeight > oldW / oldH) {
            const newH = oldW * (img.naturalHeight / img.naturalWidth);
            this.main.select.placeAt(0, 0, 0, oldH - newH, img);
          } else {
            const newW = oldH * (img.naturalWidth / img.naturalHeight);
            this.main.select.placeAt(0, 0, oldW - newW, 0, img);
          }
          this.worklog.captureState();
        },
      },
      extend_top: {
        internalName: 'extend_top',
        handle: (img) => {
          this.tmpImg = img;
          const oldH = this.main.size.h;
          const oldW = this.main.size.w;
          const newH = oldH + img.naturalHeight;
          const newW = Math.max(oldW, img.naturalWidth);
          const tmpData = this.ctx.getImageData(0, 0, this.main.size.w, this.main.size.h);
          this.main.resize(newW, newH);
          this.main.clearBackground();
          this.ctx.putImageData(tmpData, 0, img.naturalHeight);
          this.main.adjustSizeFull();
          if (this.main.params.backplateImgUrl) {
            calcBackplatePosition.call(this, 'top', newH, newW, img, oldH, oldW);
          }
          if (img.naturalWidth < oldW) {
            const offset = Math.round((oldW - img.naturalWidth) / 2);
            this.main.select.placeAt(offset, 0, offset, oldH, img);
          } else {
            this.main.select.placeAt(0, oldH, 0, 0, img);
          }
          this.worklog.captureState();
        }
      },
      extend_left: {
        internalName: 'extend_left',
        handle: (img) => {
          this.tmpImg = img;
          const oldH = this.main.size.h;
          const oldW = this.main.size.w;
          const newW = oldW + img.naturalWidth;
          const newH = Math.max(oldH, img.naturalHeight);
          const tmpData = this.ctx.getImageData(0, 0, this.main.size.w, this.main.size.h);
          this.main.resize(newW, newH);
          this.main.clearBackground();
          this.ctx.putImageData(tmpData, img.naturalWidth, 0);
          this.main.adjustSizeFull();
          if (this.main.params.backplateImgUrl) {
            calcBackplatePosition.call(this, 'left', newH, newW, img, oldH, oldW);
          }
          if (img.naturalHeight < oldH) {
            const offset = Math.round((oldH - img.naturalHeight) / 2);
            this.main.select.placeAt(0, offset, oldW, offset, img);
          } else {
            this.main.select.placeAt(oldW, 0, 0, 0, img);
          }
          this.worklog.captureState();
        }
      },
      extend_right: {
        internalName: 'extend_right',
        handle: (img) => {
          this.tmpImg = img;
          const oldH = this.main.size.h;
          const oldW = this.main.size.w;
          const newW = oldW + img.naturalWidth;
          const newH = Math.max(oldH, img.naturalHeight);
          const tmpData = this.ctx.getImageData(0, 0, this.main.size.w, this.main.size.h);
          this.main.resize(newW, newH);
          this.main.clearBackground();
          this.ctx.putImageData(tmpData, 0, 0);
          this.main.adjustSizeFull();
          if (this.main.params.backplateImgUrl) {
            calcBackplatePosition.call(this, 'right');
          }
          if (img.naturalHeight < oldH) {
            const offset = Math.round((oldH - img.naturalHeight) / 2);
            this.main.select.placeAt(oldW, offset, 0, offset, img);
          } else {
            this.main.select.placeAt(oldW, 0, 0, 0, img);
          }
          this.worklog.captureState();
        },
      },
      extend_down: {
        internalName: 'extend_down',
        handle: (img) => {
          this.tmpImg = img;
          const oldH = this.main.size.h;
          const oldW = this.main.size.w;
          const newH = oldH + img.naturalHeight;
          const newW = Math.max(oldW, img.naturalWidth);
          const tmpData = this.ctx.getImageData(0, 0, this.main.size.w, this.main.size.h);
          this.main.resize(newW, newH);
          this.main.clearBackground();
          this.ctx.putImageData(tmpData, 0, 0);
          this.main.adjustSizeFull();
          if (this.main.params.backplateImgUrl) {
            calcBackplatePosition.call(this, 'down', newH, newW, img, oldH, oldW);
          }
          if (img.naturalWidth < oldW) {
            const offset = Math.round((oldW - img.naturalWidth) / 2);
            this.main.select.placeAt(offset, oldH, offset, 0, img);
          } else {
            this.main.select.placeAt(0, oldH, 0, 0, img);
          }
          this.worklog.captureState();
        },
      },
    };
    this.activeOption = this.pasteOptions;
  }

  init(main) {
    this.CLIP_DATA_MARKER = 'painterro-image-data';
    this.ctx = main.ctx;
    this.main = main;
    this.worklog = main.worklog;
    this.selector = main.wrapper.querySelector('.ptro-paster-select-wrapper');
    this.cancelChoosing();
    this.img = null;
    this.mimetype = null; // mime of pending image
    Object.keys(this.pasteOptions).forEach((k) => {
      const o = this.pasteOptions[k];
      this.main.doc.getElementById(o.id).onclick = () => {
        if (this.loading) {
          this.doLater = o.handle;
        } else {
          o.handle(this.img);
        }
        this.cancelChoosing();
      };
    });
    this.loading = false;
    this.doLater = null;
  }

  insert(x, y, w, h) {
    this.main.ctx.drawImage(this.tmpImg, x, y, w, h);
    this.main.worklog.reCaptureState();
  }

  cancelChoosing() {
    this.selector.setAttribute('hidden', '');
    this.waitChoice = false;
  }

  loaded(img, mimetype) {
    this.img = img;
    this.mimetype = mimetype;
    this.loading = false;
    if (this.doLater) {
      this.doLater(img);
      this.doLater = null;
    }
  }

  handleOpen(src, mimetype) {
    this.startLoading();
    const handleIt = (source) => {
      const img = new Image();
      const empty = this.main.worklog.clean;
      img.onload = () => {
        if (empty) {
          this.main.fitImage(img, mimetype);
        } else {
          this.loaded(img, mimetype);
        }
        this.finishLoading();
      };
      img.src = source;
      if (!empty) {
        if (Object.keys(this.activeOption).length !== 1) {
          this.selector.removeAttribute('hidden');
          this.waitChoice = true;
        } else {
          this.doLater = this.activeOption[Object.keys(this.activeOption)[0]].handle;
        }
      }
    };

    if (src.indexOf('data') !== 0) {
      imgToDataURL(src, (dataUrl) => { // if CORS will not allow,
        // better see error in console than have different canvas mode
        handleIt(dataUrl);
      });
    } else {
      handleIt(src);
    }
  }

  handleKeyDown(evt) {
    if (this.waitChoice && evt.keyCode === KEYS.esc) {
      this.cancelChoosing();
      return true;
    }
    if (this.waitChoice && event.keyCode === KEYS.enter) {
      return true; // mark as handled - user might expect doing save by enter
    }
    return false;
  }

  startLoading() {
    this.loading = true;
    const btn = this.main.doc.getElementById(this.main.toolByName.open.buttonId);
    const icon = this.main.doc.querySelector(`#${this.main.toolByName.open.buttonId} > i`);
    if (btn) {
      btn.setAttribute('disabled', 'true');
    }
    if (icon) {
      icon.className = 'ptro-icon ptro-icon-loading ptro-spinning';
    }
  }

  finishLoading() {
    const btn = this.main.doc.getElementById(this.main.toolByName.open.buttonId);
    const icon = this.main.doc.querySelector(`#${this.main.toolByName.open.buttonId} > i`);
    if (btn) {
      btn.removeAttribute('disabled');
    }
    if (icon) {
      icon.className = 'ptro-icon ptro-icon-open';
    }
    if (this.main.params.onImageLoaded) {
      this.main.params.onImageLoaded();
    }
  }

  static get() {
    if (instance) {
      return instance;
    }
    instance = new Inserter();
    return instance;
  }

  activeOptions(actOpt) {
    const po = Object.keys(this.pasteOptions);
    po.forEach((i) => {
      let b = false;
      actOpt.forEach((k) => {
        if (i === k) {
          b = true;
        }
      });
      if (b === false) {
        delete this.pasteOptions[i];
      }
    });
    this.activeOption = this.pasteOptions;
  }

  html() {
    let fitControls = '';
    let extendControls = '';
    Object.keys(this.pasteOptions).forEach((k) => {
      if(k === 'replace_all' || k === 'paste_over') {
        const o = this.pasteOptions[k];
        o.id = genId();
        fitControls += `<div class="ptro-paster-fit">${controlObjToString(o, 'ptro-selector-fit')}<div class="ptro-paster-wrapper-label">${tr(`pasteOptions.${o.internalName}`)}</div></div>`;
      } else {
        const extendObj = this.pasteOptions[k]
        extendObj.id = genId();
        extendControls += controlObjToString(extendObj, 'ptro-selector-extend');
      }
    });
    return '<div class="ptro-paster-select-wrapper" hidden><div class="ptro-paster-select ptro-v-middle">' +
      '<div class="ptro-in ptro-v-middle-in">' +
      ` <div class="ptro-paster-wrappers-fits">
        ${fitControls}
        <div class="ptro-paster-select-wrapper-extends">
          <div class="ptro-paster-extends-items">
            ${extendControls}
          </div>
          <div class="ptro-paster-wrapper-label">extend</div>
        </div>
        </div>
      </div></div></div>`;
  }
}

export function setActivePasteOptions(a) {
  return Inserter.get().activeOptions(a);
}

function controlObjToString(o, btnClassName='') {
  return `<button type="button" id="${o.id}" class="ptro-selector-btn ptro-color-control ${btnClassName}">` +
  `<div><i class="ptro-icon ptro-icon-paste_${o.internalName}"></i></div>` +
  `<div>${tr(`pasteOptions.${o.internalName}`)}</div>` +
  '</button>';
}

function changeBackplateStyle(xPos='center', yPos='center', sizeH='auto', sizeW='auto') {
  this.main.tabelCell.style.backgroundPosition = `${xPos} ${yPos}`;
  this.main.tabelCell.style.backgroundSize = `${sizeW} ${sizeH}`;
  this.main.substrate.style.opacity = 0;
}

function calcBackplatePosition(extendSide, newH, newW, imgPaste, oldH, oldW) {
  if(extendSide === 'top') {
    const bckImgOffsetDown = this.main.backplateImgSize.offSetDown || 0;
    const bckImgHeight = this.main.backplateImgSize.height;
    const bckImgWidth = this.main.backplateImgSize.width;
    const canvasWidth = parseInt(this.main.substrate.style.width);
    const canvasHeight = parseInt(this.main.substrate.style.height);
    const tabelCellHeight = parseInt(window.getComputedStyle(this.main.tabelCell).height);
    const tabelCellPaddingTop = (tabelCellHeight - canvasHeight) / 2;
    const isRect = bckImgWidth !== bckImgHeight;
    const bckHeightRatio = newH / oldH;
    const bckSizeWidth = isRect ? canvasWidth : canvasWidth;
    const bckSizeHeight = isRect ? bckImgHeight / bckHeightRatio : canvasWidth;
    const bckOffsetTop = tabelCellPaddingTop + (canvasHeight - (bckSizeHeight + bckImgOffsetDown));
    changeBackplateStyle.call(
      this, 
      'center', 
      bckOffsetTop + 'px',
      bckSizeHeight + 'px',
      bckSizeWidth + 'px'
    );
    this.main.backplateImgSize.height = bckSizeHeight;
    this.main.backplateImgSize.width = bckSizeWidth;
    this.main.backplateImgSize.offSetUp = canvasHeight - bckSizeHeight - bckImgOffsetDown; 
  } 
  else if(extendSide === 'left') {
    const bckImgHeight = this.main.backplateImgSize.height;
    const bckImgWidth = this.main.backplateImgSize.width;
    const canvasWidth = parseInt(this.main.substrate.style.width);
    const canvasHeight = parseInt(this.main.substrate.style.height);
    const tabelCellWidth = parseInt(window.getComputedStyle(this.main.tabelCell).width);
    const tabelCellPaddingLeft = (tabelCellWidth - canvasWidth) / 2;
    const isRect = bckImgWidth !== bckImgHeight;
    const bckHeightRatio = newW / oldW;
    let bckSizeWidth = 0;
    if(!isRect) {
      bckSizeWidth = canvasHeight;
    } else {
      if(canvasHeight < bckImgHeight) {
        bckSizeWidth = bckImgWidth / bckHeightRatio;
      } else {
        bckSizeWidth = bckImgWidth;
      }
    }
    const bckSizeHeight = isRect ? canvasHeight : canvasHeight;
    const bckOffsetLeft = tabelCellPaddingLeft + (canvasWidth - bckSizeWidth);
    console.log(bckHeightRatio, oldW)
    changeBackplateStyle.call(
      this, 
      bckOffsetLeft + 'px', 
      'center', 
      bckSizeHeight + 'px', 
      bckSizeWidth + 'px'
    );
    this.main.backplateImgSize.height = bckSizeHeight;
    this.main.backplateImgSize.width = bckSizeWidth;
  }
  else if(extendSide === 'right') {
    this.main.tabelCell.style.width = this.main.substrate.style.width;
    changeBackplateStyle.call(
      this, 
      this.main.substrate.style.left, 
      'center', 
      this.main.substrate.style.height
    );
  }
  else if(extendSide === 'down') {
    const bckImgOffSetUp = this.main.backplateImgSize.offSetUp || 0;
    const bckImgHeight = this.main.backplateImgSize.height;
    const bckImgWidth = this.main.backplateImgSize.width;
    const deltaOfRealCropImg = this.main.backplateImgSize.deltOfRealandCrop;
    const canvasWidth = parseInt(this.main.substrate.style.width);
    const canvasHeight = parseInt(this.main.substrate.style.height);
    const tabelCellHeight = parseInt(window.getComputedStyle(this.main.tabelCell).height);
    const tabelCellPaddingTop = (tabelCellHeight - canvasHeight) / 2;
    const startCanvasRealHeight = canvasHeight + deltaOfRealCropImg;
    const sizeOfPasteimgs = newH - startCanvasRealHeight;
    const isRect = bckImgWidth !== bckImgHeight;
    const bckHeightRatio = newH / oldH;
    const bckSizeWidth = isRect ? canvasWidth : canvasWidth;
    const bckSizeHeight = isRect ? bckImgHeight / bckHeightRatio : canvasWidth;
    const bckOffSetTop = tabelCellPaddingTop + bckImgOffSetUp;
    changeBackplateStyle.call(
      this, 
      'center', 
      bckOffSetTop  + 'px',
      bckSizeHeight + 'px',
      bckSizeWidth + 'px'
    );
    this.main.backplateImgSize.height = bckSizeHeight;
    this.main.backplateImgSize.width = bckSizeWidth;
    console.log('down',canvasHeight - bckSizeHeight);
    this.main.backplateImgSize.offSetDown = canvasHeight - bckSizeHeight;
  }
}

