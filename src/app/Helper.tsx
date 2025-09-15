"use client";
import React from "react";
import Sidebar from "../components/Sidebar";
import { usePathname } from "next/navigation";

export default function Helper({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const path = usePathname();
  return (
    <div className=" flex w-full">
      {!path.includes("login") && <Sidebar />}
      <div
        className={` ${
          !path.includes("login")
            ? "md:absolute top-0 md:left-72  md:w-[calc(100vw-288px)] w-full mt-12 md:mt-0"
            : " w-full flex justify-center items-center "
        } `}
      >
        {children}
      </div>
    </div>
  );
}
