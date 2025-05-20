import React, { useEffect } from "react";
import rfb from "rfb2";

const VNCViewer = () => {
  useEffect(() => {
    const canvas = document.getElementById("vncCanvas") as HTMLCanvasElement;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      console.error("2D コンテキストを取得できませんでした");
      return;
    }

    const client = rfb.createConnection({
      host: "raspberrypi.local",
      port: 5900,
      password: "your_password",
    });

    client.on("connect", () => {
      console.log("VNC 接続成功");
    });

    client.on("rect", (rect) => {
      const imageData = ctx.createImageData(rect.width, rect.height);
      imageData.data.set(rect.data);
      ctx.putImageData(imageData, rect.x, rect.y);
    });

    return () => {
      client.end();
    };
  }, []);

  return <canvas id="vncCanvas" width={800} height={600}></canvas>;
};

export default VNCViewer;
