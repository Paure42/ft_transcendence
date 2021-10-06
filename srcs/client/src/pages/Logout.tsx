import React, { useEffect, useState } from "react";
import { Redirect } from "react-router-dom";
import { SocketContext } from "../socket/context";
import { useUser, defaultUser } from '../components/context/UserAuthContext';
import axios from "axios";


function Logout(props: any) {

    const socket = React.useContext(SocketContext);
    const { user, setUser } = useUser()!;

    useEffect(() => {
        if (user.id > 0 && user.username.length > 0)
        {
            axios.post(`/authentication/log-out`, { withCredentials: true})
                 .then((response) => {
                     console.log(response)
                     setUser(defaultUser);
                     props.history.push('/login');
                     socket.emit('logout', user.username);
                     socket.off();
                 })
        }
        else
        {
            props.history.push('/login');
        }
    })
    return (<div/>);
}

export default Logout
