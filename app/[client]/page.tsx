"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function ClientPage() {
  const params = useParams();
  const client = params.client as string;
  const [loading, setLoading] = useState(true);
  
  const fetchClient = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/client/${client}`);
      const data = await response.json();
      console.log(data);
      return data;
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchClient();
  }, [client]);


  return <div>ClientPage</div>;
}