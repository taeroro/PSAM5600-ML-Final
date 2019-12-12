import React, { useState, useEffect, useRef } from 'react';
import { Viewport } from 'pixi-viewport';
import * as PIXI from 'pixi.js';

import Overlay from './Overlay';
import positions from './image_umap_position';
import './App.css';


function App() {
  const [overlay, setOverlay] = useState(null);
  const canvas = useRef(null);

  useEffect(() => {
    const app = new PIXI.Application({
      width: window.innerWidth,
      height: window.innerHeight,
      view: canvas.current,
      antialias: true
    });

    let positionDict = {}

    for(let i = 0; i < positions.length; i ++) {
      // const filename = positions[i].filename.replace(/\//g, '_');
      const filename = positions[i].filename.replace('faces_gray/', '');
      console.log(filename);
      const name = filename.replace('.jpg', '');

      app.loader.add(name, "./faces_gray/" + filename)

      positionDict[name] = positions[i];
    }

    const viewport = new Viewport({
        screenWidth: window.innerWidth,
        screenHeight: window.innerHeight,
        worldWidth: 500,
        worldHeight: 500,
        interaction: app.renderer.plugins.interaction // the interaction module is important for wheel to work properly when renderer.view is placed or scaled
    })

    window.addEventListener('resize', resize);

    function resize() {
      viewport.resize(window.innerWidth,window.innerHeight,500,500);
      console.log(viewport.screenWidth);
      app.view.width = window.innerWidth;
      app.view.height = window.innerHeight;
    }


    // add the viewport to the stage
    app.stage.addChild(viewport);

    // activate plugins
    viewport
        .drag()
        .pinch()
        .wheel()
        .decelerate()

    viewport.setZoom(.1, true);
    viewport.sortableChildren = true;

    let sprites = [];
    let index = 0;

    // drag axis
    let graphics = new PIXI.Graphics();
    viewport.addChild(graphics);
    graphics.lineStyle(10, 0xFFFFFF, 1);
    graphics.drawCircle(0, 0, 1000);
    graphics.drawCircle(0, 0, 4000);
    graphics.drawCircle(0, 0, 6000);
    graphics.drawCircle(0, 0, 8000);
    graphics.alpha = 0;


    app.loader.load((loader, resources) => {

      for(let key in resources) {
        const imageSprite = new PIXI.Sprite(resources[key].texture);

        const clusterPos = positionDict[key].cluster_pos;

        imageSprite.x = 5 * app.renderer.width * (clusterPos[0] * 2 - 1);
        imageSprite.y = 5 * app.renderer.width * (clusterPos[1] * 2 - 1);

        imageSprite.anchor.x = 0.5;
        imageSprite.anchor.y = 0.5;
        imageSprite.alpha = 0;
        imageSprite.zIndex = 0;

        imageSprite.interactive = true;

        //erase
        imageSprite.id = index;
        imageSprite.fadeInTime = Math.random() * 200;

        const name = key;

        imageSprite.on('click', () => {
          setOverlay(positionDict[name]);
        });

        imageSprite.on('mouseover', () => {
          imageSprite.height = imageSprite.height * 2;
          imageSprite.width = imageSprite.width * 2;
          imageSprite.zIndex = 1;

          graphics.alpha = 1;
          graphics.x = imageSprite.x;
          graphics.y = imageSprite.y;
        });

        imageSprite.on('mouseout', () => {
          imageSprite.hover = false;
          imageSprite.height = imageSprite.height * .5;
          imageSprite.width = imageSprite.width * .5;
          imageSprite.zIndex = -1;

          graphics.alpha = 0;
        });


        viewport.addChild(imageSprite);

        sprites.push(imageSprite);
        index++;

      }
    });

  //animation
  let time = 0
  app.ticker.add((delta) => {
    time++;

    sprites.forEach(i => {
      if(time > i.fadeInTime && i.alpha < 1) {
        i.alpha += .1;

        // increment range 0 < alpha <= 0.5
        // i.alpha += Math.random(0.5);
      }
    })
  })

  }, [])



  return (
    <div className="App">
      <canvas
        ref={canvas}
      />
      {overlay &&
        <Overlay
          details={overlay}
          setOverlay={setOverlay}
        />
      }
    </div>
  );
}

export default App;
