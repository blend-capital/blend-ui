import { Input, Typography } from "@mui/material";
import { useState } from "react";
import { Divider } from "../components/common/Divider";
import { OpaqueButton } from "../components/common/OpaqueButton";
import { Row } from "../components/common/Row";
import { useWallet } from "../contexts/wallet";
import { useStore } from "../store/store";
import theme from "../theme";

export default function NetworkPage(){
  const {walletAddress,getNetworkDetails,walletId} = useWallet();
  const {network,setNetwork} = useStore((state) => state);
  const [newNetworkRPCUrl,setNewNetworkRPCUrl] = useState<string>();
  const [newNetworkPassphrase,setNewNetworkPassphrase] = useState<string>();
  const loadBlendData = useStore((state) => state.loadBlendData);
  function fetchFromWallet(){
    getNetworkDetails().then((networkDetails) => {
      if(networkDetails.rpc){
        setNewNetworkPassphrase(networkDetails.passphrase);
        setNewNetworkRPCUrl(networkDetails.rpc);
      }
    })
  }

  function handleUpdateNetworkClick(){
    if(newNetworkRPCUrl && newNetworkPassphrase){
      setNetwork(newNetworkRPCUrl,newNetworkPassphrase);
      loadBlendData(true);
    }
  }


  return <>
  <>
      <Row>
        <Typography variant="h1">
          Network Configuration 
        </Typography>
      </Row>
      <Divider />
     {!!network.rpc &&  <Row sx={{gap:"1rem",flexDirection:"column"}}>

     <Typography variant="h2" >
        Current Network Details
      </Typography>
      <Typography variant="h3">
        RPC Url
      </Typography>
      <Typography variant="h4" sx={{color:theme.palette.text.secondary}}>
        {network.rpc}
      </Typography>
      <Typography variant="h3">
        Passphrase

      </Typography>
      <Typography variant="h4" sx={{color:theme.palette.text.secondary}}>
        {network.passphrase}
      </Typography>
 
      </Row>}
      <Divider />
      <Row sx={{flexDirection:"column",gap:"1rem",alignItems:"start"}}>
      <Typography variant="h2">
        Update Network Details
      </Typography>

     <Row sx={{flexDirection:"column",display:"flex",gap:"1rem"}}>
     <Input placeholder="Input RPC Url" type="text" value={newNetworkRPCUrl} onChange={(e) => setNewNetworkRPCUrl(e.target.value)} />
      <Input placeholder="Input Passphrase " type="text" value={newNetworkPassphrase} onChange={(e) => setNewNetworkPassphrase(e.target.value)} />
      {walletId === "freighter"  &&  <OpaqueButton sx={{width:"20rem",margin:"auto"}} palette={{
        main: theme.palette.text.primary,
      opaque: theme.palette.menu.light,
      contrastText: theme.palette.text.primary,
      light: theme.palette.text.secondary,
      dark: theme.palette.text.secondary,

    }} onClick={fetchFromWallet}>Fetch from Wallet</OpaqueButton>}
      <OpaqueButton sx={{width:"20rem",margin:"auto"}} palette={theme.palette.primary} onClick={handleUpdateNetworkClick}>Update</OpaqueButton>
     </Row>
      </Row>

      
    </>
</>
}