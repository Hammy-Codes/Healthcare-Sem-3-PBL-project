#ifndef CAREBRIDGE_PASSWORDS_HPP
#define CAREBRIDGE_PASSWORDS_HPP
#include <windows.h>
#include <stdexcept>
#include <string>
#include <sstream>
#include <iomanip>
#include <vector>
#include <cstdlib>
namespace carebridge {
class Passwords {
    typedef LONG NTSTATUS;
    typedef NTSTATUS (WINAPI *OpenFn)(void**,LPCWSTR,LPCWSTR,ULONG);
    typedef NTSTATUS (WINAPI *CloseFn)(void*,ULONG);
    typedef NTSTATUS (WINAPI *RandomFn)(void*,unsigned char*,ULONG,ULONG);
    typedef NTSTATUS (WINAPI *DeriveFn)(void*,unsigned char*,ULONG,unsigned char*,ULONG,unsigned long long,unsigned char*,ULONG,ULONG);
    HMODULE dll_; void* alg_; CloseFn close_; RandomFn random_; DeriveFn derive_;
    static std::string hex(const unsigned char*p,std::size_t n){std::ostringstream s;s<<std::hex<<std::setfill('0');for(std::size_t i=0;i<n;i++)s<<std::setw(2)<<(unsigned)p[i];return s.str();}
    static std::vector<unsigned char> unhex(const std::string&s){if(s.size()%2)return std::vector<unsigned char>();std::vector<unsigned char>v;for(std::size_t i=0;i<s.size();i+=2){char*t=0;unsigned long x=strtoul(s.substr(i,2).c_str(),&t,16);if(!t||*t)return std::vector<unsigned char>();v.push_back((unsigned char)x);}return v;}
public:
    Passwords():dll_(LoadLibraryA("bcrypt.dll")),alg_(0),close_(0),random_(0),derive_(0){if(!dll_)throw std::runtime_error("Windows bcrypt.dll unavailable");OpenFn open=(OpenFn)GetProcAddress(dll_,"BCryptOpenAlgorithmProvider");close_=(CloseFn)GetProcAddress(dll_,"BCryptCloseAlgorithmProvider");random_=(RandomFn)GetProcAddress(dll_,"BCryptGenRandom");derive_=(DeriveFn)GetProcAddress(dll_,"BCryptDeriveKeyPBKDF2");if(!open||!close_||!random_||!derive_||open(&alg_,L"SHA256",0,8)<0)throw std::runtime_error("Windows PBKDF2-SHA256 unavailable");}
    ~Passwords(){if(close_&&alg_)close_(alg_,0);if(dll_)FreeLibrary(dll_);}
    Passwords(const Passwords&)=delete;Passwords&operator=(const Passwords&)=delete;
    std::string hash(const std::string&password){if(password.size()<8||password.size()>256)throw std::invalid_argument("password must be 8 to 256 characters");unsigned char salt[16],out[32];if(random_(0,salt,sizeof salt,2)<0||derive_(alg_,(unsigned char*)password.data(),(ULONG)password.size(),salt,sizeof salt,200000,out,sizeof out,0)<0)throw std::runtime_error("password hashing failed");return "pbkdf2-sha256$200000$"+hex(salt,sizeof salt)+"$"+hex(out,sizeof out);}
    bool verify(const std::string&password,const std::string&encoded){std::vector<std::string>part;std::size_t a=0;while(true){std::size_t b=encoded.find('$',a);part.push_back(encoded.substr(a,b==std::string::npos?b:b-a));if(b==std::string::npos)break;a=b+1;}if(part.size()!=4||part[0]!="pbkdf2-sha256"||part[1]!="200000")return false;std::vector<unsigned char>salt=unhex(part[2]),want=unhex(part[3]);if(salt.size()!=16||want.size()!=32)return false;unsigned char got[32];if(derive_(alg_,(unsigned char*)password.data(),(ULONG)password.size(),salt.data(),(ULONG)salt.size(),200000,got,sizeof got,0)<0)return false;unsigned char diff=0;for(std::size_t i=0;i<sizeof got;i++)diff|=got[i]^want[i];return diff==0;}
    std::string token(){unsigned char b[32];if(random_(0,b,sizeof b,2)<0)throw std::runtime_error("token generation failed");return hex(b,sizeof b);}
};
}
#endif
