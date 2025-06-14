export const baseApiURL = () => {
  return "http://localhost:5001/api" || process.env.REACT_APP_APILINK;
};