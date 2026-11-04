import { useState } from "react";

const useModalState = <T extends Record<string, boolean>>(initialState: T) => {
	const [state, setState] = useState(initialState);

	const openModal = (modalName: keyof T) => {
		setState((prevState) => ({
			...prevState,
			[modalName]: true,
		}));
	};

	const closeModal = (modalName: keyof T) => {
		setState((prevState) => ({
			...prevState,
			[modalName]: false,
		}));
	};

	return {
		state,
		openModal,
		closeModal,
	};
};

export default useModalState;
